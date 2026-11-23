/**
 * On-chain verification shared by the edge worker and the Node dev server.
 *
 * Nothing is written to the database on the strength of a string the browser
 * sent: a launch or donation is only accepted after its signature is read back
 * from a Solana RPC node, the transaction succeeded, the expected accounts are
 * involved and the shelter wallet actually received the lamports.
 */

export interface RpcEnv {
  SOLANA_RPC_URL?: string;
  SOLANA_NETWORK?: string;
}

export const SOLANA_NETWORK_DEFAULT = 'devnet';
export const SOLANA_RPC_DEFAULT = 'https://api.devnet.solana.com';

export const rpcUrl = (env: RpcEnv): string => env.SOLANA_RPC_URL?.trim() || SOLANA_RPC_DEFAULT;
export const networkName = (env: RpcEnv): string => env.SOLANA_NETWORK?.trim() || SOLANA_NETWORK_DEFAULT;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

/** 32-44 base58 characters, the shape of every Solana address. */
export const isSolanaAddress = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 32 && value.length <= 44 && BASE58.test(value);

/** Transaction signatures are 64-byte base58 strings (86-88 chars, never under 64). */
export const isSignature = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 64 && value.length <= 96 && BASE58.test(value);

export const solscanTx = (signature: string, network: string): string =>
  `https://solscan.io/tx/${signature}${network === 'mainnet-beta' ? '' : `?cluster=${network}`}`;

export const solscanAccount = (address: string, network: string): string =>
  `https://solscan.io/account/${address}${network === 'mainnet-beta' ? '' : `?cluster=${network}`}`;

interface ParsedAccountKey {
  pubkey?: string;
  signer?: boolean;
}

export interface ParsedTransaction {
  blockTime: number | null;
  failed: boolean;
  accountKeys: ParsedAccountKey[];
  balanceDelta: (address: string) => number;
}

/**
 * Turns an RPC `getTransaction` result into the few facts verification needs.
 * Returns null when the shape is not usable.
 */
export const parseTransaction = (result: unknown): ParsedTransaction | null => {
  if (!result || typeof result !== 'object') return null;
  const tx = result as {
    blockTime?: number | null;
    meta?: { err?: unknown; preBalances?: number[]; postBalances?: number[] } | null;
    transaction?: { message?: { accountKeys?: ParsedAccountKey[] } } | null;
  };

  const keys = tx.transaction?.message?.accountKeys;
  if (!Array.isArray(keys)) return null;

  const pre = Array.isArray(tx.meta?.preBalances) ? tx.meta!.preBalances! : [];
  const post = Array.isArray(tx.meta?.postBalances) ? tx.meta!.postBalances! : [];

  return {
    blockTime: typeof tx.blockTime === 'number' ? tx.blockTime : null,
    failed: Boolean(tx.meta?.err),
    accountKeys: keys,
    balanceDelta: (address: string) => {
      let delta = 0;
      keys.forEach((key, index) => {
        if (key?.pubkey === address) {
          delta += Number(post[index] ?? 0) - Number(pre[index] ?? 0);
        }
      });
      return delta;
    },
  };
};

const REQUEST_TIMEOUT_MS = 8000;

type RpcOutcome = { ok: true; result: unknown } | { ok: false; error: string };

const rpcCall = async (env: RpcEnv, body: unknown): Promise<RpcOutcome> => {
  const attempt = async (): Promise<unknown> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(rpcUrl(env), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`RPC responded ${response.status}`);
      const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
      if (payload?.error) throw new Error(payload.error.message || 'RPC error');
      return payload?.result ?? null;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return { ok: true, result: await attempt() };
  } catch (first) {
    try {
      return { ok: true, result: await attempt() };
    } catch (second) {
      return { ok: false, error: String(second || first) };
    }
  }
};

export type TransactionFetch =
  | { status: 'ok'; transaction: ParsedTransaction | null }
  | { status: 'unavailable'; error: string };

/**
 * Reads a transaction back from the RPC node. An RPC outage is reported as
 * `unavailable` so callers can answer 503 instead of blaming the user's data.
 */
export const fetchTransaction = async (env: RpcEnv, signature: string): Promise<TransactionFetch> => {
  const outcome = await rpcCall(env, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }],
  });

  if (!outcome.ok) return { status: 'unavailable', error: outcome.error };
  return { status: 'ok', transaction: parseTransaction(outcome.result) };
};

export interface VerificationRequest {
  signature: string;
  /** Address that must have signed the transaction. */
  signer?: string;
  /** Address that must appear among the transaction's account keys. */
  account?: string;
  /** Address that must have gained at least `minLamports`. */
  recipient?: string;
  minLamports?: number;
  /** Reject transactions older than this. Defaults to one hour. */
  maxAgeMs?: number;
}

export type VerificationResult =
  | { ok: true; blockTime: number | null }
  | { ok: false; error: string; unavailable?: boolean };

export const verifyTransaction = async (
  env: RpcEnv,
  request: VerificationRequest,
): Promise<VerificationResult> => {
  if (!isSignature(request.signature)) {
    return { ok: false, error: 'That is not a valid Solana transaction signature' };
  }

  const fetched = await fetchTransaction(env, request.signature);
  if (fetched.status === 'unavailable') {
    return {
      ok: false,
      unavailable: true,
      error: `On-chain verification is temporarily unavailable (${fetched.error}). Nothing was recorded — try again shortly.`,
    };
  }

  const parsed = fetched.transaction;
  if (!parsed) {
    return { ok: false, error: 'Transaction could not be found on Solana — check the network and try again' };
  }
  if (parsed.failed) {
    return { ok: false, error: 'That transaction failed on-chain, so nothing was recorded' };
  }

  const maxAge = request.maxAgeMs ?? 60 * 60 * 1000;
  if (parsed.blockTime && Date.now() - parsed.blockTime * 1000 > maxAge) {
    return { ok: false, error: 'That transaction is too old to verify' };
  }

  const keys = parsed.accountKeys;
  if (request.signer && !keys.some((key) => key.pubkey === request.signer && key.signer)) {
    return { ok: false, error: 'The connected wallet did not sign that transaction' };
  }
  if (request.account && !keys.some((key) => key.pubkey === request.account)) {
    return { ok: false, error: 'That transaction does not reference this coin' };
  }
  if (request.recipient) {
    const received = parsed.balanceDelta(request.recipient);
    const minimum = Number(request.minLamports ?? 0);
    if (received < minimum) {
      return { ok: false, error: 'That transaction did not pay the shelter wallet the recorded amount' };
    }
  }

  return { ok: true, blockTime: parsed.blockTime };
};
