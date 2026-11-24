/**
 * Admin session tokens.
 *
 * The admin passphrase is never used as a bearer token: signing in exchanges it
 * for a short-lived HMAC-signed token. Both the Cloudflare worker and the Node
 * dev server run this module (WebCrypto is available in both), so a token means
 * the same thing in either runtime.
 */

const encoder = new TextEncoder();

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const toBase64Url = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sign = async (secret: string, payload: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(signature);
};

/** Constant-time string comparison, so a wrong passphrase leaks nothing. */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

/** Issues `v1.<expiry>.<hmac>` for the given admin secret. */
export const createSession = async (secret: string, ttlMs = SESSION_TTL_MS): Promise<string> => {
  const payload = `v1.${Date.now() + ttlMs}`;
  return `${payload}.${await sign(secret, payload)}`;
};

export const verifySession = async (secret: string, token: string | null): Promise<boolean> => {
  if (!secret || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;

  const expiry = Number(parts[1]);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;

  const expected = await sign(secret, `${parts[0]}.${parts[1]}`);
  return timingSafeEqual(expected, parts[2]);
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array | null => {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/** Fixed-length SHA-256 constant-time comparison (prevents length leakage). */
export const constantTimeDigestEqual = async (a: string, b: string): Promise<boolean> => {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i += 1) diff |= ua[i] ^ ub[i];
  return diff === 0;
};

export interface PasswordHashRecord {
  salt: string;
  hash: string;
  iterations: number;
}

const PBKDF2_ITERATIONS = 100_000;

export const hashPassword = async (password: string): Promise<PasswordHashRecord> => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return {
    salt: toHex(saltBytes),
    hash: toHex(new Uint8Array(derived)),
    iterations: PBKDF2_ITERATIONS,
  };
};

export const verifyPassword = async (
  password: string,
  record: PasswordHashRecord,
): Promise<boolean> => {
  const saltBytes = fromHex(record.salt);
  const expectedBytes = fromHex(record.hash);
  if (!saltBytes || !expectedBytes || !Number.isFinite(record.iterations) || record.iterations < 10_000) {
    return false;
  }
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations: record.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      expectedBytes.length * 8,
    ),
  );
  if (derived.length !== expectedBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i += 1) diff |= derived[i] ^ expectedBytes[i];
  return diff === 0;
};

