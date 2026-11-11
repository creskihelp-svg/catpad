/**
 * CatPad edge worker.
 *
 * Serves the built SPA plus the same /api surface as server.ts, backed by the
 * seed data held in memory. Intended for the hosted preview: writes live for the
 * lifetime of the isolate and are not persisted. The Node server.ts remains the
 * source of truth for local development.
 */
import { INITIAL_CHARITIES, INITIAL_LAUNCHES, INITIAL_DONATIONS } from '../supabase/seed';

const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMPFEES_PROGRAM_ID = 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ';
const ADMIN_EMAIL = 'admin@catpad.fun';

const charities = INITIAL_CHARITIES.map((c) => ({ ...c }));
const launches = INITIAL_LAUNCHES.map((l) => ({ ...l }));
const donations = INITIAL_DONATIONS.map((d) => ({ ...d }));
const auditFailures: Array<{ id: string; type: string; details: string; timestamp: string }> = [];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const sanitize = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : '';

const isAdmin = (request: Request, env: { ADMIN_SECRET_KEY?: string }) => {
  const header = request.headers.get('authorization');
  if (!header || !env.ADMIN_SECRET_KEY) return false;
  return header.replace(/^Bearer\s+/i, '').trim() === env.ADMIN_SECRET_KEY;
};

async function handleApi(request: Request, env: { ADMIN_SECRET_KEY?: string; ADMIN_EMAIL?: string }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const segments = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  // --- status -------------------------------------------------------------
  if (path === '/api/network-status') {
    return json({
      network: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      rpcHealthy: true,
      pumpFunProgramId: PUMPFUN_PROGRAM_ID,
      pumpFeesProgramId: PUMPFEES_PROGRAM_ID,
    });
  }

  // --- charities ----------------------------------------------------------
  if (segments[0] === 'charities') {
    if (method === 'GET' && segments.length === 1) return json({ charities });

    if (method === 'GET' && segments.length === 2) {
      const charity = charities.find((c) => c.id === segments[1]);
      if (!charity) return json({ error: 'Charity not found' }, 404);
      return json({
        charity,
        launches: launches.filter((l) => l.charity_id === charity.id),
        donations: donations.filter((d) => d.charity_id === charity.id),
      });
    }
  }

  // --- launches -----------------------------------------------------------
  if (segments[0] === 'launches') {
    if (method === 'GET' && segments.length === 1) {
      let results = [...launches];
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

      const sort = url.searchParams.get('sort');
      if (sort === 'market_cap') {
        results.sort((a, b) => Number(b.market_cap_sol) - Number(a.market_cap_sol));
      } else if (sort === 'bps') {
        results.sort((a, b) => b.donation_bps - a.donation_bps);
      } else {
        results.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      }

      return json({ launches: results });
    }

    if (method === 'GET' && segments.length === 2) {
      const launch = launches.find((l) => l.mint === segments[1]);
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
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const charity = charities.find((c) => c.id === body.charityId);
      const amount = Number(body.amountSol);
      if (!charity) return json({ error: 'Charity not found' }, 400);
      if (!amount || amount <= 0) return json({ error: 'Missing donation fields' }, 400);

      const donation = {
        id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        launch_id: null,
        charity_id: charity.id,
        amount_sol: amount,
        tx_signature: sanitize(body.txSignature),
        status: 'confirmed' as const,
        distribution_type: 'direct_donation' as const,
        created_at: new Date().toISOString(),
      };
      donations.unshift(donation);
      charity.total_donations_sol = Number(
        (Number(charity.total_donations_sol) + amount).toFixed(3),
      );
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
        charity: { id: charity.id, name: charity.name, wallet: charity.wallet_address },
        feeConfig: {
          creatorShareBps: 10000 - bps,
          charityShareBps: bps,
          isImmutable: Boolean(body.isImmutable),
        },
      });
    }

    if (method === 'POST' && segments[1] === 'confirm-launch') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const charity = charities.find((c) => c.id === body.charityId);
      if (!charity) return json({ error: 'Invalid charity' }, 400);
      if (!body.mint || !body.txSignature || !body.creatorWallet) {
        return json({ error: 'Missing mandatory launch parameters' }, 400);
      }

      const existing = launches.find((l) => l.mint === body.mint);
      if (existing) return json({ success: true, launch: existing });

      const launch = {
        id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mint: sanitize(body.mint),
        name: sanitize(body.name) || 'Untitled cat coin',
        symbol: sanitize(body.symbol).toUpperCase() || 'CAT',
        description: sanitize(body.description),
        image_url: sanitize(body.imageUrl) || '/brand/coin.png',
        metadata_uri: sanitize(body.metadataUri),
        creator_wallet: sanitize(body.creatorWallet),
        charity_id: charity.id,
        donation_bps: Number(body.donationBps) || 0,
        is_immutable: body.isImmutable !== false,
        tx_signature: sanitize(body.txSignature),
        config_pda: `CfgPDA-${String(body.mint).slice(0, 8)}-${charity.wallet_address.slice(0, 8)}`,
        twitter: sanitize(body.twitter),
        telegram: sanitize(body.telegram),
        website: sanitize(body.website),
        is_featured: false,
        market_cap_sol: 28.5,
        bonding_curve_progress: 1.2,
        status: 'confirmed' as const,
        created_at: new Date().toISOString(),
      };

      launches.unshift(launch);
      charity.total_donations_sol = Number((Number(charity.total_donations_sol) + 0.003).toFixed(3));
      return json({ success: true, launch });
    }
  }

  // --- admin --------------------------------------------------------------
  if (segments[0] === 'admin') {
    if (method === 'POST' && segments[1] === 'login') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const email = sanitize(body.email) || ADMIN_EMAIL;
      if (env.ADMIN_SECRET_KEY && body.password === env.ADMIN_SECRET_KEY) {
        return json({
          success: true,
          token: env.ADMIN_SECRET_KEY,
          user: { email, role: 'superadmin' },
        });
      }
      return json({ error: 'Admin access is not configured for this preview' }, 401);
    }

    if (!isAdmin(request, env)) return json({ error: 'Forbidden: Insufficient privileges' }, 403);

    if (method === 'GET' && segments[1] === 'overview') {
      return json({
        totalDonationsSol: Number(
          donations.reduce((acc, d) => acc + Number(d.amount_sol), 0).toFixed(3),
        ),
        totalLaunches: launches.length,
        verifiedCharities: charities.filter((c) => c.is_verified).length,
        failuresCount: auditFailures.length,
      });
    }

    if (method === 'GET' && segments[1] === 'failures') return json({ failures: auditFailures });

    if (segments[1] === 'launches' && segments[3] === 'toggle-featured' && method === 'POST') {
      const launch = launches.find((l) => l.mint === segments[2]);
      if (!launch) return json({ error: 'Launch not found' }, 404);
      launch.is_featured = !launch.is_featured;
      return json({ success: true, is_featured: launch.is_featured });
    }

    if (segments[1] === 'charities') {
      if (method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (!body.name || !body.wallet_address) return json({ error: 'Missing required charity fields' }, 400);
        const charity = {
          id: `c-${Date.now()}`,
          name: sanitize(body.name),
          ein_tax_id: sanitize(body.ein_tax_id),
          website: sanitize(body.website),
          wallet_address: sanitize(body.wallet_address),
          description: sanitize(body.description),
          avatar_url: sanitize(body.avatar_url) || '/brand/coin.png',
          is_verified: true,
          total_donations_sol: 0,
        };
        charities.unshift(charity);
        return json({ success: true, charity });
      }

      if (segments.length === 3 && method === 'PUT') {
        const charity = charities.find((c) => c.id === segments[2]);
        if (!charity) return json({ error: 'Charity not found' }, 404);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (body.name) charity.name = sanitize(body.name);
        if (body.website) charity.website = sanitize(body.website);
        if (body.wallet_address) charity.wallet_address = sanitize(body.wallet_address);
        if (body.description) charity.description = sanitize(body.description);
        if (body.avatar_url) charity.avatar_url = sanitize(body.avatar_url);
        if (body.is_verified !== undefined) charity.is_verified = Boolean(body.is_verified);
        return json({ success: true, charity });
      }

      if (segments.length === 3 && method === 'DELETE') {
        const index = charities.findIndex((c) => c.id === segments[2]);
        if (index === -1) return json({ error: 'Charity not found' }, 404);
        charities.splice(index, 1);
        return json({ success: true });
      }
    }
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (r: Request) => Promise<Response> }; ADMIN_SECRET_KEY?: string; ADMIN_EMAIL?: string }) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'DELETE') {
        return json({ error: 'Method not allowed' }, 405);
      }

      // Mutations are same-origin only.
      const origin = request.headers.get('origin');
      if (request.method !== 'GET' && origin && new URL(origin).host !== url.host) {
        return json({ error: 'Cross-origin request blocked' }, 403);
      }

      return handleApi(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // Client-side routes (e.g. /charities, /risk, unknown paths) render the SPA.
    if (request.method === 'GET' && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }

    return response;
  },
};
