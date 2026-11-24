/**
 * CatPad edge worker.
 *
 * Serves the built SPA plus the /api surface. Charities, launches, donations and
 * the admin log are persisted in the deployment's D1 database when the DB
 * binding is present, so everything survives cold starts and redeploys. Launches
 * and donations are only accepted after their transaction was verified against
 * a Solana RPC node. The Node server.ts handles local dev with the same rules.
 */
import {
  readCharities,
  insertCharity,
  updateCharity,
  deleteCharity,
  addToCharityTotal,
  readLaunches,
  insertLaunch,
  updateLaunchFlags,
  readDonations,
  insertDonation,
  registerLoginAttempt,
  clearLoginAttempts,
  registerWriteAttempt,
  logAdminAction,
  readAdminActions,
  readBannerSetting,
  writeBannerSetting,
} from './db.ts';
import type { DbEnv } from './db.ts';
import type { AdminAction, Charity, Donation, Launch, SiteBanner } from '../src/types.ts';
import {
  constantTimeDigestEqual,
  createSession,
  verifySession,
} from './session.ts';
import { isSignature, isSolanaAddress, networkName, rpcUrl, verifyTransaction } from './solana.ts';
import { reportError } from './report.ts';

const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMPFEES_PROGRAM_ID = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ';
const MAX_DONATION_SOL = 1000;

type AppEnv = DbEnv & {
  ADMIN_SECRET_KEY?: string;
  ADMIN_USERNAME?: string;
  SOLANA_RPC_URL?: string;
  SOLANA_NETWORK?: string;
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
};

type WorkerEnv = AppEnv & { ASSETS: { fetch: (r: Request) => Promise<Response> } };

const charities: Charity[] = [];
const launches: Launch[] = [];
const donations: Donation[] = [];
const adminActions: AdminAction[] = [];
const auditFailures: Array<{ id: string; type: string; details: string; timestamp: string }> = [];
let siteBanner: SiteBanner = {
  text: 'CA dropping soon',
  ca_address: '',
  enabled: true,
  updated_at: new Date().toISOString(),
};

/** Configured via server env (Settings -> Secrets). */
const adminKey = (env: AppEnv) => env.ADMIN_SECRET_KEY?.trim() || '';
const adminUsername = (env: AppEnv) => env.ADMIN_USERNAME?.trim() || '';
const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const sanitize = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : '';

const bearer = (request: Request) => {
  const header = request.headers.get('authorization');
  return header ? header.replace(/^Bearer\s+/i, '').trim() : null;
};

const isAdmin = async (request: Request, env: AppEnv) => {
  const token = bearer(request);
  if (!token) return false;
  return verifySession(adminKey(env), token);
};

const clientIp = (request: Request) =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';

// --- sign-in throttle -------------------------------------------------------

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/**
 * D1 is the shared counter (worker isolates don't share memory). The in-memory
 * map is only the fallback for a deployment without a database binding.
 */
const signInBlocked = async (request: Request, env: AppEnv): Promise<boolean> => {
  const ip = clientIp(request);
  const shared = await registerLoginAttempt(env, ip, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (shared) return shared.blocked;

  const entry = loginAttempts.get(ip);
  return Boolean(entry && Date.now() < entry.resetAt && entry.count >= LOGIN_LIMIT);
};

const noteFailedLogin = async (request: Request, env: AppEnv) => {
  const ip = clientIp(request);
  const shared = await registerLoginAttempt(env, ip, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (shared) return;

  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
};

// --- public write throttle --------------------------------------------------

const writeAttempts = new Map<string, { count: number; resetAt: number }>();
const WRITE_LIMIT = 20;
const WRITE_WINDOW_MS = 10 * 60 * 1000;

/** Throttles the unauthenticated write endpoints (launches and donations). */
const writeBlocked = async (request: Request, env: AppEnv): Promise<boolean> => {
  const ip = clientIp(request);
  const shared = await registerWriteAttempt(env, ip, WRITE_LIMIT, WRITE_WINDOW_MS);
  if (shared) return shared.blocked;

  const now = Date.now();
  const entry = writeAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    writeAttempts.set(ip, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > WRITE_LIMIT;
};

// --- helpers ----------------------------------------------------------------

const withSecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const noteFailure = (type: string, details: string) => {
  auditFailures.unshift({ id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, details, timestamp: new Date().toISOString() });
  if (auditFailures.length > 50) auditFailures.length = 50;
};

const recordAdminAction = async (env: AppEnv, action: string, target: string, details: string) => {
  const entry: AdminAction = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    target,
    details,
    created_at: new Date().toISOString(),
  };
  adminActions.unshift(entry);
  if (adminActions.length > 100) adminActions.length = 100;
  try {
    await logAdminAction(env, entry);
  } catch (error) {
    reportError(env, error, { scope: 'admin-action-log' });
  }
};

/**
 * Refreshes the in-memory caches from D1 when the deployment has a DB binding.
 * Without one (local wrangler dev) the in-memory copies stay in use.
 */
async function hydrate(env: AppEnv) {
  try {
    const [charityRows, launchRows, donationRows, bannerRow] = await Promise.all([
      readCharities(env),
      readLaunches(env),
      readDonations(env),
      readBannerSetting(env),
    ]);
    if (charityRows) charities.splice(0, charities.length, ...charityRows);
    if (launchRows) launches.splice(0, launches.length, ...launchRows);
    if (donationRows) donations.splice(0, donations.length, ...donationRows);
    if (bannerRow) siteBanner = bannerRow;
  } catch (error) {
    reportError(env, error, { scope: 'hydrate' });
  }
}

const sortLaunches = (list: Launch[], sort: string | null) => {
  if (sort === 'market_cap') {
    return list.sort((a, b) => (b.market_cap_sol ?? -1) - (a.market_cap_sol ?? -1));
  }
  if (sort === 'bps') return list.sort((a, b) => b.donation_bps - a.donation_bps);
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const formatPercent = (bps: number) => `${Math.round(bps / 100)}%`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string,
  );

/** Replaces one <meta> tag (the project's index.html spreads tags over lines). */
const setMeta = (html: string, attr: string, key: string, value: string): string => {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta[^>]*?${attr}=["']${safeKey}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
};

async function serveCoinPage(request: Request, env: WorkerEnv, mint: string): Promise<Response> {
  await hydrate(env);
  const indexRes = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  const launch = launches.find((l) => l.mint === mint && !l.is_unlisted);
  if (!launch) return indexRes;

  const charity = charities.find((c) => c.id === launch.charity_id);
  const origin = new URL(request.url).origin;
  const title = `${launch.name} ($${launch.symbol}) — CatPad`;
  const description = `${formatPercent(launch.donation_bps)} of creator fees go to ${
    charity?.name ?? 'a verified cat shelter'
  }. Launch verified on Solana ${networkName(env)}.`;
  const image = /^https:\/\//i.test(launch.image_url) ? launch.image_url : `${origin}/brand/coin.png`;
  const canonical = `${origin}/coin/${launch.mint}`;

  let html = await indexRes.text();
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:image', image);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', image);
  html = html.replace('</head>', `    <link rel="canonical" href="${escapeHtml(canonical)}">\n  </head>`);

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}

async function handleApi(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const segments = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  // Only the routes that read or write persisted data need the database.
  if (['charities', 'admin', 'donations', 'pump', 'launches', 'banner'].includes(segments[0] ?? '')) {
    await hydrate(env);
  }

  // --- status & banner ----------------------------------------------------
  if (path === '/api/network-status') {
    return json({
      network: networkName(env),
      rpcUrl: rpcUrl(env),
      rpcHealthy: true,
      pumpFunProgramId: PUMPFUN_PROGRAM_ID,
      pumpFeesProgramId: PUMPFEES_PROGRAM_ID,
    });
  }

  if (path === '/api/banner' && method === 'GET') {
    return json({ banner: siteBanner });
  }

  // --- charities ----------------------------------------------------------
  if (segments[0] === 'charities') {
    if (method === 'GET' && segments.length === 1) return json({ charities });

    if (method === 'GET' && segments.length === 2) {
      const charity = charities.find((c) => c.id === segments[1]);
      if (!charity) return json({ error: 'Charity not found' }, 404);
      return json({
        charity,
        launches: launches.filter((l) => l.charity_id === charity.id && !l.is_unlisted),
        donations: donations.filter((d) => d.charity_id === charity.id),
      });
    }
  }

  // --- launches -----------------------------------------------------------
  if (segments[0] === 'launches') {
    const admin = await isAdmin(request, env);
    const visible = launches.filter((l) => admin || !l.is_unlisted);

    if (method === 'GET' && segments.length === 1) {
      let results = [...visible];
      if (url.searchParams.get('featured') === 'true') results = results.filter((l) => l.is_featured);

      const charityId = url.searchParams.get('charityId');
      if (charityId) results = results.filter((l) => l.charity_id === charityId);

      const search = url.searchParams.get('search')?.toLowerCase();
      if (search) {
        results = results.filter(
          (l) =>
            l.name.toLowerCase().includes(search) ||
            l.symbol.toLowerCase().includes(search) ||
            l.mint.toLowerCase().includes(search),
        );
      }

      return json({ launches: sortLaunches(results, url.searchParams.get('sort')) });
    }

    if (method === 'GET' && segments.length === 2) {
      const launch = visible.find((l) => l.mint === segments[1]);
      if (!launch) return json({ error: 'Launch not found' }, 404);
      return json({
        launch,
        charity: charities.find((c) => c.id === launch.charity_id),
        donations: donations.filter((d) => d.launch_id === launch.id),
      });
    }
  }

  // --- donations ----------------------------------------------------------
  if (segments[0] === 'donations') {
    if (method === 'GET' && segments.length === 1) return json({ donations });

    if (method === 'POST' && segments[1] === 'record') {
      if (await writeBlocked(request, env)) {
        return json({ error: 'Too many submissions from this connection. Try again in a few minutes.' }, 429);
      }

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const charity = charities.find((c) => c.id === sanitize(body.charityId));
      const amount = Number(body.amountSol);
      const txSignature = sanitize(body.txSignature);

      if (!charity) return json({ error: 'Charity not found' }, 400);
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_DONATION_SOL) {
        return json({ error: 'Donation amount must be between 0 and 1000 SOL' }, 400);
      }
      if (!isSignature(txSignature)) return json({ error: 'That is not a valid Solana transaction signature' }, 400);

      const existing = donations.find((d) => d.tx_signature === txSignature);
      if (existing) return json({ success: true, duplicate: true, donation: existing });

      const verification = await verifyTransaction(env, {
        signature: txSignature,
        recipient: charity.wallet_address,
        minLamports: Math.round(amount * 1e9),
      });
      if (!verification.ok) {
        noteFailure('DONATION_NOT_VERIFIED', `${verification.error} (charity ${charity.id}, ${amount} SOL)`);
        if (verification.unavailable) reportError(env, new Error(verification.error), { scope: 'donation-verify' });
        return json({ error: verification.error }, verification.unavailable ? 503 : 400);
      }

      const donation: Donation = {
        id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        launch_id: null,
        charity_id: charity.id,
        amount_sol: amount,
        tx_signature: txSignature,
        status: 'confirmed',
        distribution_type: 'direct_donation',
        created_at: new Date().toISOString(),
      };

      const saved = await insertDonation(env, donation);
      if (!saved.ok && !saved.duplicate) return json({ error: 'Could not record the donation' }, 500);

      donations.unshift(donation);
      charity.total_donations_sol = Number((Number(charity.total_donations_sol) + amount).toFixed(3));
      await addToCharityTotal(env, charity.id, amount);
      return json({ success: true, donation });
    }
  }

  // --- pump launch flow ---------------------------------------------------
  if (segments[0] === 'pump') {
    if (method === 'POST' && segments[1] === 'prepare-launch') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const charity = charities.find((c) => c.id === body.charityId);
      if (!charity) return json({ error: 'Invalid or unverified charity selected' }, 400);

      const bps = Number(body.donationBps);
      if (!Number.isFinite(bps) || bps < 500 || bps > 10000) {
        return json({ error: 'Donation share must be between 500 bps (5%) and 10000 bps (100%)' }, 400);
      }

      return json({
        success: true,
        programId: PUMPFUN_PROGRAM_ID,
        pumpFeesProgramId: PUMPFEES_PROGRAM_ID,
        network: networkName(env),
        charity: { id: charity.id, name: charity.name, wallet: charity.wallet_address },
        feeConfig: {
          creatorShareBps: 10000 - bps,
          charityShareBps: bps,
          isImmutable: Boolean(body.isImmutable),
        },
      });
    }

    if (method === 'POST' && segments[1] === 'confirm-launch') {
      if (await writeBlocked(request, env)) {
        return json({ error: 'Too many submissions from this connection. Try again in a few minutes.' }, 429);
      }

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const charity = charities.find((c) => c.id === sanitize(body.charityId));
      const mint = sanitize(body.mint);
      const txSignature = sanitize(body.txSignature);
      const creatorWallet = sanitize(body.creatorWallet);

      if (!charity) return json({ error: 'Invalid charity' }, 400);
      if (!isSolanaAddress(mint) || !isSolanaAddress(creatorWallet)) {
        return json({ error: 'Mint and creator wallet must be valid Solana addresses' }, 400);
      }
      if (!isSignature(txSignature)) return json({ error: 'That is not a valid Solana transaction signature' }, 400);

      const duplicate = launches.find((l) => l.mint === mint);
      if (duplicate) return json({ success: true, launch: duplicate });

      const bps = Number(body.donationBps);
      if (!Number.isFinite(bps) || bps < 500 || bps > 10000) {
        return json({ error: 'Donation share must be between 500 bps (5%) and 10000 bps (100%)' }, 400);
      }

      const verification = await verifyTransaction(env, {
        signature: txSignature,
        signer: creatorWallet,
        account: mint,
        recipient: charity.wallet_address,
        minLamports: 1,
      });
      if (!verification.ok) {
        noteFailure('LAUNCH_NOT_VERIFIED', `${verification.error} (mint ${mint}, creator ${creatorWallet})`);
        if (verification.unavailable) reportError(env, new Error(verification.error), { scope: 'launch-verify' });
        return json({ error: verification.error }, verification.unavailable ? 503 : 400);
      }

      const launch: Launch = {
        id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mint,
        name: sanitize(body.name) || 'Untitled cat coin',
        symbol: sanitize(body.symbol).toUpperCase() || 'CAT',
        description: sanitize(body.description),
        image_url: sanitize(body.imageUrl) || '/brand/coin.png',
        metadata_uri: sanitize(body.metadataUri),
        creator_wallet: creatorWallet,
        charity_id: charity.id,
        donation_bps: bps,
        is_immutable: body.isImmutable !== false,
        tx_signature: txSignature,
        twitter: sanitize(body.twitter) || undefined,
        telegram: sanitize(body.telegram) || undefined,
        website: sanitize(body.website) || undefined,
        is_featured: false,
        is_unlisted: false,
        market_cap_sol: null,
        bonding_curve_progress: null,
        status: 'confirmed',
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const saved = await insertLaunch(env, launch);
      if (!saved.ok) {
        const concurrent = launches.find((l) => l.mint === mint);
        if (concurrent) return json({ success: true, launch: concurrent });
        return json({ error: 'That coin or transaction is already registered' }, 409);
      }

      launches.unshift(launch);
      return json({ success: true, launch });
    }
  }

  // --- admin --------------------------------------------------------------
  if (segments[0] === 'admin') {
    if (method === 'POST' && segments[1] === 'login') {
      if (await signInBlocked(request, env)) {
        return json({ error: 'Too many sign-in attempts. Try again in a few minutes.' }, 429);
      }

      const envSecret = adminKey(env);
      const envUser = adminUsername(env);

      if (!envSecret || !envUser) {
        return json(
          {
            error:
              'Admin credentials are not configured on the server. Set ADMIN_USERNAME and ADMIN_SECRET_KEY in Settings → Secrets.',
          },
          503,
        );
      }

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const rawIdentifier =
        typeof body.identifier === 'string'
          ? body.identifier
          : typeof body.email === 'string'
            ? body.email
            : typeof body.username === 'string'
              ? body.username
              : '';
      const supplied = typeof body.password === 'string' ? body.password : '';

      const identifierOk = await constantTimeDigestEqual(
        normalizeIdentifier(rawIdentifier),
        normalizeIdentifier(envUser),
      );
      const passwordOk = await constantTimeDigestEqual(supplied, envSecret);

      if (!identifierOk || !passwordOk) {
        await noteFailedLogin(request, env);
        return json({ error: 'Invalid admin identifier or password' }, 401);
      }

      await clearLoginAttempts(env, clientIp(request));
      loginAttempts.delete(clientIp(request));

      return json({
        success: true,
        token: await createSession(envSecret),
        user: { email: envUser, role: 'superadmin' },
      });
    }

    if (!(await isAdmin(request, env))) return json({ error: 'Forbidden: Insufficient privileges' }, 403);

    if (method === 'GET' && segments[1] === 'overview') {
      return json({
        totalDonationsSol: Number(donations.reduce((acc, d) => acc + Number(d.amount_sol), 0).toFixed(3)),
        totalLaunches: launches.length,
        hiddenLaunches: launches.filter((l) => l.is_unlisted).length,
        verifiedCharities: charities.filter((c) => c.is_verified).length,
        failuresCount: auditFailures.length,
      });
    }

    if (method === 'GET' && segments[1] === 'failures') return json({ failures: auditFailures });

    if (method === 'GET' && segments[1] === 'audit') {
      const stored = await readAdminActions(env, 50);
      return json({ actions: stored ?? adminActions.slice(0, 50) });
    }

    // Every launch, including hidden ones.
    if (method === 'GET' && segments[1] === 'launches' && segments.length === 2) {
      return json({ launches });
    }

    if (segments[1] === 'banner' && (method === 'PUT' || method === 'POST')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const nextText = sanitize(body.text).slice(0, 160);
      const nextCa = sanitize(body.ca_address).slice(0, 64);
      const nextEnabled = body.enabled === undefined ? siteBanner.enabled : Boolean(body.enabled);

      if (nextEnabled && !nextText) {
        return json({ error: 'Banner text cannot be empty when the banner is enabled' }, 400);
      }

      siteBanner = {
        text: nextText || 'CA dropping soon',
        ca_address: nextCa,
        enabled: nextEnabled,
        updated_at: new Date().toISOString(),
      };
      await writeBannerSetting(env, siteBanner);
      await recordAdminAction(
        env,
        'banner.update',
        'site_banner',
        siteBanner.enabled
          ? `"${siteBanner.text}"${siteBanner.ca_address ? ` (${siteBanner.ca_address})` : ''}`
          : 'Banner hidden',
      );
      return json({ success: true, banner: siteBanner });
    }

    if (segments[1] === 'launches' && segments[3] === 'toggle-featured' && method === 'POST') {
      const launch = launches.find((l) => l.mint === segments[2]);
      if (!launch) return json({ error: 'Launch not found' }, 404);
      launch.is_featured = !launch.is_featured;
      await updateLaunchFlags(env, launch.mint, { is_featured: launch.is_featured });
      await recordAdminAction(env, 'launch.featured', launch.mint, launch.is_featured ? 'Featured' : 'Unfeatured');
      return json({ success: true, is_featured: launch.is_featured });
    }

    if (segments[1] === 'launches' && segments[3] === 'unlist' && method === 'POST') {
      const launch = launches.find((l) => l.mint === segments[2]);
      if (!launch) return json({ error: 'Launch not found' }, 404);
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const unlist = body.unlisted === undefined ? !launch.is_unlisted : Boolean(body.unlisted);
      launch.is_unlisted = unlist;
      await updateLaunchFlags(env, launch.mint, { is_unlisted: unlist });
      await recordAdminAction(env, 'launch.unlist', launch.mint, unlist ? 'Hidden from the directory' : 'Restored to the directory');
      return json({ success: true, is_unlisted: unlist });
    }

    if (segments[1] === 'charities') {
      if (method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (!body.name || !body.wallet_address) return json({ error: 'Missing required charity fields' }, 400);
        if (!isSolanaAddress(sanitize(body.wallet_address))) {
          return json({ error: 'That is not a valid Solana wallet address' }, 400);
        }
        const charity = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: sanitize(body.name),
          ein_tax_id: sanitize(body.ein_tax_id),
          website: sanitize(body.website),
          wallet_address: sanitize(body.wallet_address),
          description: sanitize(body.description),
          avatar_url: sanitize(body.avatar_url) || '/brand/coin.png',
          is_verified: true,
          total_donations_sol: 0,
          created_at: new Date().toISOString(),
        };

        const saved = await insertCharity(env, charity);
        if (!saved.ok) {
          return json(
            {
              error: saved.conflict
                ? 'That wallet address is already registered to another shelter'
                : 'Could not save the shelter',
            },
            saved.conflict ? 409 : 500,
          );
        }

        charities.unshift(charity);
        await recordAdminAction(env, 'shelter.create', charity.id, charity.name);
        return json({ success: true, charity });
      }

      if (segments.length === 3 && method === 'PUT') {
        const charity = charities.find((c) => c.id === segments[2]);
        if (!charity) return json({ error: 'Charity not found' }, 404);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (body.name) charity.name = sanitize(body.name);
        if (body.website) charity.website = sanitize(body.website);
        if (body.wallet_address) {
          if (!isSolanaAddress(sanitize(body.wallet_address))) {
            return json({ error: 'That is not a valid Solana wallet address' }, 400);
          }
          charity.wallet_address = sanitize(body.wallet_address);
        }
        if (body.description) charity.description = sanitize(body.description);
        if (body.avatar_url) charity.avatar_url = sanitize(body.avatar_url);
        if (body.ein_tax_id !== undefined) charity.ein_tax_id = sanitize(body.ein_tax_id);
        if (body.is_verified !== undefined) charity.is_verified = Boolean(body.is_verified);
        await updateCharity(env, charity);
        await recordAdminAction(env, 'shelter.update', charity.id, charity.name);
        return json({ success: true, charity });
      }

      if (segments.length === 3 && method === 'DELETE') {
        const index = charities.findIndex((c) => c.id === segments[2]);
        if (index === -1) return json({ error: 'Charity not found' }, 404);
        const [removed] = charities.splice(index, 1);
        await deleteCharity(env, removed.id);
        await recordAdminAction(env, 'shelter.delete', removed.id, removed.name);
        return json({ success: true });
      }
    }
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'DELETE') {
        return json({ error: 'Method not allowed' }, 405);
      }

      // Mutations are same-origin only.
      const origin = request.headers.get('origin');
      const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
      const originHost = origin ? new URL(origin).host : null;
      if (
        request.method !== 'GET' &&
        originHost &&
        originHost !== url.host &&
        (!forwardedHost || originHost !== forwardedHost)
      ) {
        return json({ error: 'Cross-origin request blocked' }, 403);
      }

      try {
        return withSecurityHeaders(await handleApi(request, env));
      } catch (error) {
        reportError(env, error, { scope: 'api', path: url.pathname });
        return withSecurityHeaders(json({ error: 'Internal server error' }, 500));
      }
    }

    // Per-coin pages carry their own title and share tags for crawlers.
    const coinMatch = url.pathname.match(/^\/coin\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/);
    if (request.method === 'GET' && coinMatch) {
      try {
        return withSecurityHeaders(await serveCoinPage(request, env, coinMatch[1]));
      } catch (error) {
        reportError(env, error, { scope: 'coin-page', path: url.pathname });
      }
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return withSecurityHeaders(response);

    // Client-side routes (e.g. /shelters, /transparency, unknown paths) render the SPA.
    if (request.method === 'GET' && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      return withSecurityHeaders(await env.ASSETS.fetch(new Request(new URL('/', url), request)));
    }

    return withSecurityHeaders(response);
  },
};
