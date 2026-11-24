import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Coins,
  KeyRound,
  Wallet as WalletIcon,
  X,
  Download,
} from 'lucide-react';
import bs58 from 'bs58';
import { useWallet } from '../context/WalletContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { WALLET_OPTIONS, WalletLogo, isWalletDetected } from '../lib/wallets.tsx';
import { DEVNET_WALLET_ENABLED } from '../lib/brand.ts';
import { shortAddress } from '../lib/format.ts';
import { Spinner } from './ui/Primitives.tsx';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Accepts the formats a devnet key is normally exported in: the base58 string
 * this app generates, or the JSON byte array that `solana-keygen` and Phantom
 * produce. The decoded secret is handed straight to the wallet context and kept
 * in memory only — nothing is written to storage.
 */
const normalizeSecretKey = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      const bytes = JSON.parse(trimmed);
      if (!Array.isArray(bytes) || bytes.length === 0) return null;
      if (!bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) return null;
      return bs58.encode(Uint8Array.from(bytes));
    } catch {
      return null;
    }
  }
  return trimmed;
};

/** Import a devnet key funded outside the app so signing still happens in the browser. */
const DevnetKeyImport: React.FC<{ onImported: () => void }> = ({ onImported }) => {
  const { importPrivateKey } = useWallet();
  const { toast } = useToast();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeSecretKey(secret);
    if (!normalized) {
      setError('Paste a base58 secret key or a JSON byte array.');
      return;
    }
    setImporting(true);
    const ok = await importPrivateKey(normalized);
    setImporting(false);
    if (!ok) {
      setError('That key could not be read. Check you pasted the secret key, not the address.');
      return;
    }
    setSecret('');
    setError(null);
    toast('Devnet test wallet imported', 'success');
    onImported();
  };

  return (
    <form onSubmit={handleImport} className="space-y-2">
      <label htmlFor="devnet-secret" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Import a funded devnet key
      </label>
      <input
        id="devnet-secret"
        type="password"
        value={secret}
        onChange={(event) => {
          setSecret(event.target.value);
          if (error) setError(null);
        }}
        placeholder="Base58 secret key or [byte,array]"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink outline-none transition placeholder:text-muted focus:border-accent"
      />
      {error && <p className="text-[11px] leading-relaxed text-accent">{error}</p>}
      <button
        type="submit"
        disabled={importing || !secret.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition hover:border-accent disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4 text-accent" />
        {importing ? 'Reading key...' : 'Use this key'}
      </button>
      <p className="text-[11px] leading-relaxed text-muted">
        Held in memory for this tab only and cleared on disconnect or reload.
      </p>
    </form>
  );
};

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const {
    connected,
    publicKeyString,
    balanceSol,
    walletName,
    walletType,
    isConnecting,
    network,
    connectWallet,
    generateTestWallet,
    requestDevnetAirdrop,
    disconnect,
  } = useWallet();
  const { toast } = useToast();

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [airdropLoading, setAirdropLoading] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (id: (typeof WALLET_OPTIONS)[number]['id']) => {
    setPendingId(id);
    const ok = await connectWallet(id);
    setPendingId(null);
    if (ok) {
      toast('Wallet connected', 'success');
      onClose();
    } else {
      toast('Could not connect that wallet. Unlock the extension and try again.', 'error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicKeyString);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Could not copy the address', 'error');
    }
  };

  const handleAirdrop = async () => {
    setAirdropLoading(true);
    const sig = await requestDevnetAirdrop();
    setAirdropLoading(false);
    toast(
      sig ? 'Test SOL requested — it may take a few seconds to land.' : 'The devnet faucet is rate limited right now.',
      sig ? 'success' : 'error'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Wallet"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-card p-6 text-left">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-accent">
              <WalletIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                {connected ? 'Wallet connected' : 'Connect a wallet'}
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                {connected ? walletName : 'Solana'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet dialog"
            className="rounded-md p-1.5 text-muted transition hover:bg-black/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!connected ? (
          <div className="space-y-2">
            {WALLET_OPTIONS.map((wallet) => {
              const detected = isWalletDetected(wallet.id);
              const busy = pendingId === wallet.id;

              if (!detected) {
                return (
                  <a
                    key={wallet.id}
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 transition hover:border-line-strong hover:bg-card-hover"
                  >
                    <span className="flex items-center gap-3">
                      <WalletLogo id={wallet.id} className="h-6 w-6 text-ink" />
                      <span className="text-sm font-medium text-ink">{wallet.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      <Download className="h-3 w-3" />
                      Install
                    </span>
                  </a>
                );
              }

              return (
                <button
                  key={wallet.id}
                  type="button"
                  disabled={isConnecting}
                  onClick={() => handleConnect(wallet.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:border-accent hover:bg-card-hover disabled:opacity-60"
                >
                  <span className="flex items-center gap-3">
                    <WalletLogo id={wallet.id} className="h-6 w-6 text-ink" />
                    <span className="text-sm font-medium text-ink">{wallet.name}</span>
                  </span>
                  {busy ? (
                    <Spinner />
                  ) : (
                    <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                      Detected
                    </span>
                  )}
                </button>
              );
            })}

            {DEVNET_WALLET_ENABLED && (
              <div className="pt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Development
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await generateTestWallet();
                    toast('Devnet test wallet generated', 'success');
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-line-strong px-4 py-3 text-left transition hover:border-accent"
                >
                  <span className="text-sm text-ink">Generate devnet test wallet</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Local only
                  </span>
                </button>
                <div className="mt-2">
                  <DevnetKeyImport onImported={onClose} />
                </div>
              </div>
            )}

            <p className="pt-2 text-[11px] leading-relaxed text-muted">
              CatPad never stores your keys. Every launch and donation is signed in your wallet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Address
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 font-mono text-xs text-ink transition hover:text-accent"
                >
                  {shortAddress(publicKeyString, 5)}
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-baseline justify-between px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Balance
                </span>
                <span className="font-mono text-lg font-medium text-ink">
                  {balanceSol.toFixed(4)} <span className="text-xs text-muted">SOL</span>
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Network
                </span>
                <span className="font-mono text-xs uppercase text-muted">{network}</span>
              </div>
            </div>

            {DEVNET_WALLET_ENABLED && walletType === 'generated' && (
              <button
                type="button"
                onClick={handleAirdrop}
                disabled={airdropLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-card-hover disabled:opacity-60"
              >
                <Coins className="h-4 w-4 text-accent" />
                {airdropLoading ? 'Requesting SOL...' : 'Request 1 devnet SOL'}
              </button>
            )}

            {DEVNET_WALLET_ENABLED && walletType === 'generated' && (
              <div className="rounded-lg border border-dashed border-line-strong p-3">
                <DevnetKeyImport onImported={onClose} />
              </div>
            )}

            <a
              href={`https://solscan.io/account/${publicKeyString}?cluster=${network === 'mainnet-beta' ? 'mainnet' : 'devnet'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-card-hover"
            >
              View on Solscan
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
            </a>

            <button
              type="button"
              onClick={() => {
                disconnect();
                toast('Wallet disconnected', 'info');
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
