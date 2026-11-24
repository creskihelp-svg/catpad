/**
 * D1 persistence for the edge worker.
 *
 * Charities, launches, donations, the admin action log and the abuse throttles
 * all live in the platform D1 (SQLite) binding named DB, so they survive isolate
 * restarts and redeploys. Without a binding (local `wrangler dev`, or a deploy
 * before storage exists) every function here is a no-op and the worker keeps
 * its data in memory.
 */

import type { AdminAction, Charity, Donation, Launch, SiteBanner } from '../src/types.ts';
import type { PasswordHashRecord } from './session.ts';

export interface StoredAdminClaim {
  username: string;
  passwordHash: PasswordHashRecord;
  sessionSecret: string;
  claimedAt: string;
}

type D1Row = Record<string, unknown>;

interface D1Prepared {
  all<T = D1Row>(): Promise<{ results?: T[] }>;
  first<T = D1Row>(): Promise<T | null>;
  bind(...values: unknown[]): D1Prepared;
  run(): Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1Prepared;
}

export type DbEnv = { DB?: D1DatabaseLike };

const CHARITY_SCHEMA = `CREATE TABLE IF NOT EXISTS charities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ein_tax_id TEXT,
  website TEXT NOT NULL,
  wallet_address TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 1,
  total_donations_sol REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`;

const LAUNCH_SCHEMA = `CREATE TABLE IF NOT EXISTS launches (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  charity_id TEXT NOT NULL,
  donation_bps INTEGER NOT NULL,
  is_immutable INTEGER NOT NULL DEFAULT 1,
  tx_signature TEXT NOT NULL UNIQUE,
  twitter TEXT,
  telegram TEXT,
  website TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_unlisted INTEGER NOT NULL DEFAULT 0,
  market_cap_sol REAL,
  bonding_curve_progress REAL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  verified_at TEXT,
  created_at TEXT NOT NULL
)`;

const DONATION_SCHEMA = `CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  launch_id TEXT,
  charity_id TEXT NOT NULL,
  amount_sol REAL NOT NULL,
  tx_signature TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  distribution_type TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const ADMIN_LOG_SCHEMA = `CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const LOGIN_SCHEMA = `CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
)`;

const WRITE_SCHEMA = `CREATE TABLE IF NOT EXISTS write_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
)`;

const SETTINGS_SCHEMA = `CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const CHARITY_COLUMNS = `id, name, ein_tax_id, website, wallet_address, description, avatar_url,
  is_verified, total_donations_sol, created_at`;

const LAUNCH_COLUMNS = `id, mint, name, symbol, description, image_url, metadata_uri, creator_wallet,
  charity_id, donation_bps, is_immutable, tx_signature, twitter, telegram, website, is_featured,
  is_unlisted, market_cap_sol, bonding_curve_progress, status, verified_at, created_at`;

const DONATION_COLUMNS = `id, launch_id, charity_id, amount_sol, tx_signature, status,
  distribution_type, created_at`;

const str = (value: unknown, fallback = ''): string => (value === null || value === undefined ? fallback : String(value));
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

const toCharity = (row: D1Row): Charity => ({
  id: str(row.id),
  name: str(row.name),
  ein_tax_id: row.ein_tax_id ? str(row.ein_tax_id) : undefined,
  website: str(row.website),
  wallet_address: str(row.wallet_address),
  description: str(row.description),
  avatar_url: str(row.avatar_url),
  is_verified: Number(row.is_verified) === 1,
  total_donations_sol: Number(row.total_donations_sol) || 0,
  created_at: row.created_at ? str(row.created_at) : undefined,
});

const toLaunch = (row: D1Row): Launch => ({
  id: str(row.id),
  mint: str(row.mint),
  name: str(row.name),
  symbol: str(row.symbol),
  description: str(row.description),
  image_url: str(row.image_url),
  metadata_uri: str(row.metadata_uri),
  creator_wallet: str(row.creator_wallet),
  charity_id: str(row.charity_id),
  donation_bps: Number(row.donation_bps) || 0,
  is_immutable: Number(row.is_immutable) === 1,
  tx_signature: str(row.tx_signature),
  twitter: row.twitter ? str(row.twitter) : undefined,
  telegram: row.telegram ? str(row.telegram) : undefined,
  website: row.website ? str(row.website) : undefined,
  is_featured: Number(row.is_featured) === 1,
  is_unlisted: Number(row.is_unlisted) === 1,
  market_cap_sol: numOrNull(row.market_cap_sol),
  bonding_curve_progress: numOrNull(row.bonding_curve_progress),
  status: (str(row.status, 'confirmed') as Launch['status']) || 'confirmed',
  verified_at: row.verified_at ? str(row.verified_at) : null,
  created_at: str(row.created_at),
});

const toDonation = (row: D1Row): Donation => ({
  id: str(row.id),
  launch_id: row.launch_id ? str(row.launch_id) : null,
  charity_id: str(row.charity_id),
  amount_sol: Number(row.amount_sol) || 0,
  tx_signature: str(row.tx_signature),
  status: (str(row.status, 'confirmed') as Donation['status']) || 'confirmed',
  distribution_type: str(row.distribution_type, 'direct_donation') as Donation['distribution_type'],
  created_at: str(row.created_at),
});

const toAction = (row: D1Row): AdminAction => ({
  id: str(row.id),
  action: str(row.action),
  target: str(row.target),
  details: str(row.details),
  created_at: str(row.created_at),
});

const schemas = new Map<string, Promise<void>>();

const ensure = (db: D1DatabaseLike, schema: string) => {
  let ready = schemas.get(schema);
  if (!ready) {
    ready = db.prepare(schema).run().then(() => undefined);
    schemas.set(schema, ready);
  }
  return ready;
};

// --- charities --------------------------------------------------------------

export const readCharities = async (env: DbEnv): Promise<Charity[] | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, CHARITY_SCHEMA);
  const result = await db
    .prepare(`SELECT ${CHARITY_COLUMNS} FROM charities ORDER BY created_at DESC, name ASC`)
    .all();
  return (result.results ?? []).map(toCharity);
};

export const insertCharity = async (env: DbEnv, charity: Charity): Promise<{ ok: boolean; conflict?: boolean }> => {
  const db = env.DB;
  if (!db) return { ok: true };

  await ensure(db, CHARITY_SCHEMA);
  try {
    await db
      .prepare(`INSERT INTO charities (${CHARITY_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        charity.id,
        charity.name,
        charity.ein_tax_id ?? null,
        charity.website,
        charity.wallet_address,
        charity.description,
        charity.avatar_url,
        charity.is_verified ? 1 : 0,
        Number(charity.total_donations_sol) || 0,
        charity.created_at ?? new Date().toISOString(),
      )
      .run();
    return { ok: true };
  } catch (error) {
    return { ok: false, conflict: /UNIQUE/i.test(String(error)) };
  }
};

export const updateCharity = async (env: DbEnv, charity: Charity): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await db
    .prepare(
      `UPDATE charities
          SET name = ?, ein_tax_id = ?, website = ?, wallet_address = ?, description = ?,
              avatar_url = ?, is_verified = ?, total_donations_sol = ?
        WHERE id = ?`,
    )
    .bind(
      charity.name,
      charity.ein_tax_id ?? null,
      charity.website,
      charity.wallet_address,
      charity.description,
      charity.avatar_url,
      charity.is_verified ? 1 : 0,
      Number(charity.total_donations_sol) || 0,
      charity.id,
    )
    .run();
};

export const deleteCharity = async (env: DbEnv, id: string): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await db.prepare('DELETE FROM charities WHERE id = ?').bind(id).run();
};

export const addToCharityTotal = async (env: DbEnv, id: string, amount: number): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await db
    .prepare('UPDATE charities SET total_donations_sol = total_donations_sol + ? WHERE id = ?')
    .bind(amount, id)
    .run();
};

// --- launches ---------------------------------------------------------------

export const readLaunches = async (env: DbEnv): Promise<Launch[] | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, LAUNCH_SCHEMA);
  const result = await db
    .prepare(`SELECT ${LAUNCH_COLUMNS} FROM launches ORDER BY created_at DESC`)
    .all();
  return (result.results ?? []).map(toLaunch);
};

export const insertLaunch = async (env: DbEnv, launch: Launch): Promise<{ ok: boolean; conflict?: boolean }> => {
  const db = env.DB;
  if (!db) return { ok: true };

  await ensure(db, LAUNCH_SCHEMA);
  try {
    await db
      .prepare(`INSERT INTO launches (${LAUNCH_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        launch.id,
        launch.mint,
        launch.name,
        launch.symbol,
        launch.description,
        launch.image_url,
        launch.metadata_uri,
        launch.creator_wallet,
        launch.charity_id,
        launch.donation_bps,
        launch.is_immutable ? 1 : 0,
        launch.tx_signature,
        launch.twitter ?? null,
        launch.telegram ?? null,
        launch.website ?? null,
        launch.is_featured ? 1 : 0,
        launch.is_unlisted ? 1 : 0,
        launch.market_cap_sol,
        launch.bonding_curve_progress,
        launch.status,
        launch.verified_at ?? null,
        launch.created_at,
      )
      .run();
    return { ok: true };
  } catch (error) {
    return { ok: false, conflict: /UNIQUE/i.test(String(error)) };
  }
};

/** Persists the admin-controlled flags for one launch. */
export const updateLaunchFlags = async (
  env: DbEnv,
  mint: string,
  flags: { is_featured?: boolean; is_unlisted?: boolean },
): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await ensure(db, LAUNCH_SCHEMA);

  if (flags.is_featured !== undefined) {
    await db
      .prepare('UPDATE launches SET is_featured = ? WHERE mint = ?')
      .bind(flags.is_featured ? 1 : 0, mint)
      .run();
  }
  if (flags.is_unlisted !== undefined) {
    await db
      .prepare('UPDATE launches SET is_unlisted = ? WHERE mint = ?')
      .bind(flags.is_unlisted ? 1 : 0, mint)
      .run();
  }
};

// --- donations --------------------------------------------------------------

export const readDonations = async (env: DbEnv): Promise<Donation[] | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, DONATION_SCHEMA);
  const result = await db
    .prepare(`SELECT ${DONATION_COLUMNS} FROM donations ORDER BY created_at DESC`)
    .all();
  return (result.results ?? []).map(toDonation);
};

export const insertDonation = async (
  env: DbEnv,
  donation: Donation,
): Promise<{ ok: boolean; duplicate?: boolean }> => {
  const db = env.DB;
  if (!db) return { ok: true };

  await ensure(db, DONATION_SCHEMA);
  try {
    await db
      .prepare(`INSERT INTO donations (${DONATION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        donation.id,
        donation.launch_id,
        donation.charity_id,
        donation.amount_sol,
        donation.tx_signature,
        donation.status,
        donation.distribution_type,
        donation.created_at,
      )
      .run();
    return { ok: true };
  } catch (error) {
    return { ok: false, duplicate: /UNIQUE/i.test(String(error)) };
  }
};

// --- admin activity ---------------------------------------------------------

export const logAdminAction = async (env: DbEnv, action: AdminAction): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await ensure(db, ADMIN_LOG_SCHEMA);
  await db
    .prepare('INSERT INTO admin_actions (id, action, target, details, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(action.id, action.action, action.target, action.details, action.created_at)
    .run();
};

export const readAdminActions = async (env: DbEnv, limit = 50): Promise<AdminAction[] | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, ADMIN_LOG_SCHEMA);
  const result = await db
    .prepare(`SELECT id, action, target, details, created_at FROM admin_actions ORDER BY created_at DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`)
    .all();
  return (result.results ?? []).map(toAction);
};

// --- throttles --------------------------------------------------------------

/**
 * Shared counter used by the sign-in throttle and the public write throttle.
 * Counters live in D1 so they hold across worker isolates; without a binding the
 * caller falls back to its in-memory counter.
 */
const bumpCounter = async (
  env: DbEnv,
  table: 'login_attempts' | 'write_attempts',
  schema: string,
  ip: string,
  limit: number,
  windowMs: number,
): Promise<{ blocked: boolean } | null> => {
  const db = env.DB;
  if (!db) return null;

  await ensure(db, schema);
  const now = Date.now();
  const row = await db
    .prepare(`SELECT count, reset_at FROM ${table} WHERE ip = ?`)
    .bind(ip)
    .first<{ count: number; reset_at: number }>();

  if (!row || now > Number(row.reset_at)) {
    await db
      .prepare(
        `INSERT INTO ${table} (ip, count, reset_at) VALUES (?, 1, ?)
         ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
      )
      .bind(ip, now + windowMs)
      .run();
    return { blocked: false };
  }

  if (Number(row.count) >= limit) return { blocked: true };

  await db.prepare(`UPDATE ${table} SET count = count + 1 WHERE ip = ?`).bind(ip).run();
  return { blocked: false };
};

export const registerLoginAttempt = (env: DbEnv, ip: string, limit: number, windowMs: number) =>
  bumpCounter(env, 'login_attempts', LOGIN_SCHEMA, ip, limit, windowMs);

export const registerWriteAttempt = (env: DbEnv, ip: string, limit: number, windowMs: number) =>
  bumpCounter(env, 'write_attempts', WRITE_SCHEMA, ip, limit, windowMs);

export const clearLoginAttempts = async (env: DbEnv, ip: string): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
};

// --- site settings ----------------------------------------------------------

export const readBannerSetting = async (env: DbEnv): Promise<SiteBanner | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, SETTINGS_SCHEMA);
  const row = await db
    .prepare('SELECT value, updated_at FROM site_settings WHERE key = ?')
    .bind('banner')
    .first<{ value: string; updated_at: string }>();
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<SiteBanner>;
    return {
      text: typeof parsed.text === 'string' ? parsed.text : 'CA dropping soon',
      ca_address: typeof parsed.ca_address === 'string' ? parsed.ca_address : '',
      ca_url: typeof parsed.ca_url === 'string' ? parsed.ca_url : '',
      enabled: parsed.enabled !== false,
      updated_at: row.updated_at,
    };
  } catch {
    return null;
  }
};

export const writeBannerSetting = async (env: DbEnv, banner: SiteBanner): Promise<void> => {
  const db = env.DB;
  if (!db) return;
  await ensure(db, SETTINGS_SCHEMA);
  const updatedAt = banner.updated_at ?? new Date().toISOString();
  const payload = JSON.stringify({
    text: banner.text,
    ca_address: banner.ca_address ?? '',
    ca_url: banner.ca_url ?? '',
    enabled: banner.enabled,
  });
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind('banner', payload, updatedAt)
    .run();
};

export const readAdminClaim = async (env: DbEnv): Promise<StoredAdminClaim | null> => {
  const db = env.DB;
  if (!db) return null;
  await ensure(db, SETTINGS_SCHEMA);
  const row = await db
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .bind('admin_claim')
    .first<{ value: string }>();
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<StoredAdminClaim>;
    if (
      typeof parsed.username === 'string' &&
      parsed.passwordHash &&
      typeof parsed.passwordHash.hash === 'string' &&
      typeof parsed.passwordHash.salt === 'string' &&
      typeof parsed.sessionSecret === 'string'
    ) {
      return parsed as StoredAdminClaim;
    }
    return null;
  } catch {
    return null;
  }
};

export const writeAdminClaim = async (env: DbEnv, claim: StoredAdminClaim): Promise<boolean> => {
  const db = env.DB;
  if (!db) return true;
  await ensure(db, SETTINGS_SCHEMA);
  const existing = await db
    .prepare('SELECT 1 AS present FROM site_settings WHERE key = ?')
    .bind('admin_claim')
    .first<{ present: number }>();
  if (existing) return false;

  const res = await db
    .prepare(
      `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    )
    .bind('admin_claim', JSON.stringify(claim), claim.claimedAt)
    .run();
  const changes = (res as unknown as { meta?: { changes?: number } }).meta?.changes;
  if (typeof changes === 'number') return changes > 0;
  return Boolean(res.success);
};



