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
