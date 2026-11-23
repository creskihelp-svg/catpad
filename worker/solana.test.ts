import { describe, expect, it } from 'vitest';
import { isSignature, isSolanaAddress, parseTransaction } from './solana.ts';

const base58 = (length: number) => '5'.repeat(length);

describe('address and signature validation', () => {
  it('accepts plausible Solana addresses and signatures', () => {
    expect(isSolanaAddress(base58(44))).toBe(true);
    expect(isSolanaAddress(base58(32))).toBe(true);
    expect(isSignature(base58(87))).toBe(true);
  });

  it('rejects wrong lengths, non-base58 characters and non-strings', () => {
    expect(isSolanaAddress(base58(31))).toBe(false);
    expect(isSolanaAddress(base58(45))).toBe(false);
    expect(isSolanaAddress('0'.repeat(44))).toBe(false);
    expect(isSignature(base58(63))).toBe(false);
    expect(isSignature(`0${base58(86)}`)).toBe(false);
    expect(isSolanaAddress(undefined)).toBe(false);
    expect(isSignature(42)).toBe(false);
  });
});

const rpcResult = (overrides: Record<string, unknown> = {}) => ({
  blockTime: Math.floor(Date.now() / 1000) - 30,
  meta: { err: null, preBalances: [1_000_000, 0], postBalances: [750_000, 250_000] },
  transaction: {
    message: {
      accountKeys: [
        { pubkey: 'CreatorAddress1111111111111111111111111111', signer: true },
        { pubkey: 'ShelterAddress1111111111111111111111111111', signer: false },
      ],
    },
  },
  ...overrides,
});

describe('parseTransaction', () => {
  it('reports the lamport delta for a recipient', () => {
    const parsed = parseTransaction(rpcResult());
    expect(parsed).not.toBeNull();
    expect(parsed!.failed).toBe(false);
    expect(parsed!.balanceDelta('ShelterAddress1111111111111111111111111111')).toBe(250_000);
    expect(parsed!.balanceDelta('SomeoneElse')).toBe(0);
  });

  it('flags a failed transaction', () => {
    const parsed = parseTransaction(rpcResult({ meta: { err: { InstructionError: [0, 'Custom'] } } }));
    expect(parsed?.failed).toBe(true);
  });

  it('marks the signing account', () => {
    const parsed = parseTransaction(rpcResult());
    expect(parsed!.accountKeys.some((key) => key.signer)).toBe(true);
  });

  it('returns null for an unusable response shape', () => {
    expect(parseTransaction(null)).toBeNull();
    expect(parseTransaction({})).toBeNull();
    expect(parseTransaction({ transaction: {} })).toBeNull();
  });
});
