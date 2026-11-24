import { describe, expect, it } from 'vitest';
import {
  constantTimeDigestEqual,
  createSession,
  hashPassword,
  SESSION_TTL_MS,
  timingSafeEqual,
  verifyPassword,
  verifySession,
} from './session.ts';

const secret = 'test-admin-password';

describe('admin session tokens', () => {
  it('verifies a freshly issued token', async () => {
    const token = await createSession(secret);
    expect(token.startsWith('v1.')).toBe(true);
    expect(await verifySession(secret, token)).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSession('another-password');
    expect(await verifySession(secret, token)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const token = await createSession(secret, -1000);
    expect(await verifySession(secret, token)).toBe(false);
  });

  it('rejects a tampered expiry even with the original signature', async () => {
    const token = await createSession(secret);
    const [version, , signature] = token.split('.');
    const extended = `${version}.${Date.now() + SESSION_TTL_MS * 4}.${signature}`;
    expect(await verifySession(secret, extended)).toBe(false);
  });

  it('rejects malformed tokens and missing secrets', async () => {
    expect(await verifySession(secret, null)).toBe(false);
    expect(await verifySession(secret, 'nope')).toBe(false);
    expect(await verifySession(secret, 'v1.notanumber.sig')).toBe(false);
    expect(await verifySession('', await createSession(secret))).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('compares equal and unequal values without an early length exit', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'ab')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

describe('PBKDF2 password hashing and constant-time comparison', () => {
  it('hashes and verifies matching passwords while rejecting mismatches', async () => {
    const record = await hashPassword('sample-passphrase-123');
    expect(record.salt).toHaveLength(32);
    expect(record.hash).toHaveLength(64);
    expect(await verifyPassword('sample-passphrase-123', record)).toBe(true);
    expect(await verifyPassword('wrong-passphrase', record)).toBe(false);
  });

  it('compares arbitrary-length strings via fixed-length digests', async () => {
    expect(await constantTimeDigestEqual('alpha', 'alpha')).toBe(true);
    expect(await constantTimeDigestEqual('alpha', 'alpha-longer')).toBe(false);
  });
});

