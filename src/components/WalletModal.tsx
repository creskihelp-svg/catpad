import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Coins,
  Wallet as WalletIcon,
  X,
  Download,
} from 'lucide-react';
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
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
              <h2 className="text-base font-semibold text-white">
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
            className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-white"
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
                      <WalletLogo id={wallet.id} className="h-6 w-6 text-white" />
                      <span className="text-sm font-medium text-white">{wallet.name}</span>
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
                    <WalletLogo id={wallet.id} className="h-6 w-6 text-white" />
                    <span className="text-sm font-medium text-white">{wallet.name}</span>
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
                  <span className="text-sm text-white">Generate devnet test wallet</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Local only
                  </span>
                </button>
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
                  className="flex items-center gap-1.5 font-mono text-xs text-white transition hover:text-accent"
                >
                  {shortAddress(publicKeyString, 5)}
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-baseline justify-between px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Balance
                </span>
                <span className="font-mono text-lg font-medium text-white">
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
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-white transition hover:border-line-strong hover:bg-card-hover disabled:opacity-60"
              >
                <Coins className="h-4 w-4 text-accent" />
                {airdropLoading ? 'Requesting SOL...' : 'Request 1 devnet SOL'}
              </button>
            )}

            <a
              href={`https://solscan.io/account/${publicKeyString}?cluster=${network === 'mainnet-beta' ? 'mainnet' : 'devnet'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-white transition hover:border-line-strong hover:bg-card-hover"
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
