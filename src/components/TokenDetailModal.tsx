import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Lock, Share2, ShieldCheck, Send, X } from 'lucide-react';
import { Launch, Charity } from '../types.ts';
import { BRAND } from '../lib/brand.ts';
import { formatPercent, shortAddress } from '../lib/format.ts';
import { useToast } from '../context/ToastContext.tsx';

interface TokenDetailModalProps {
  launch: Launch | null;
  charity?: Charity;
  onClose: () => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ launch, charity, onClose }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<'mint' | 'wallet' | 'link' | null>(null);

  if (!launch) return null;

  const copyText = async (text: string, key: 'mint' | 'wallet' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast('Could not copy to the clipboard', 'error');
    }
  };

  const rows = [
    { label: 'Mint', value: shortAddress(launch.mint, 6) },
    { label: 'Fee config PDA', value: launch.config_pda || 'Pending' },
    { label: 'Charity wallet', value: charity ? shortAddress(charity.wallet_address, 6) : 'Verified PDA' },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${launch.name} details`}
    >
      <div className="mx-auto my-8 w-full max-w-2xl rounded-xl border border-line bg-card">
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div className="flex items-start gap-4">
            <img
              src={launch.image_url}
              alt=""
              className="h-14 w-14 flex-shrink-0 rounded-lg border border-line object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND.assets.coin;
              }}
            />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{launch.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  ${launch.symbol}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(launch.mint, 'mint')}
                  className="flex items-center gap-1 font-mono text-[10px] text-muted transition hover:text-white"
                >
                  {shortAddress(launch.mint)}
                  {copied === 'mint' ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-relaxed text-muted">{launch.description}</p>

          <div className="flex flex-wrap gap-2">
            {launch.twitter && (
              <a
                href={launch.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line-strong hover:text-white"
              >
                X
              </a>
            )}
            {launch.telegram && (
              <a
                href={launch.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line-strong hover:text-white"
              >
                <Send className="h-3 w-3" />
                Telegram
              </a>
            )}
            {launch.website && (
              <a
                href={launch.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line-strong hover:text-white"
              >
                <Globe className="h-3 w-3" />
                Website
              </a>
            )}
          </div>

          {/* Fee share */}
          <div className="rounded-lg border border-line bg-surface px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-white">
                <ShieldCheck className="h-4 w-4 text-accent" />
                {charity?.name || 'Verified shelter'}
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-accent">
                <Lock className="h-3 w-3 text-muted" />
                {formatPercent(launch.donation_bps)} locked
              </span>
            </div>

            {charity?.ein_tax_id && (
              <p className="mt-1 font-mono text-[10px] text-muted">501(c)(3) EIN {charity.ein_tax_id}</p>
            )}

            <div className="mt-4 space-y-2 font-mono text-[11px]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span className="text-muted">{row.label}</span>
                  <span className="truncate text-white">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted">Immutability</span>
                <span className="text-accent">{launch.is_immutable ? 'Locked' : 'Revocable'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => charity && copyText(charity.wallet_address, 'wallet')}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted transition hover:text-white"
            >
              {copied === 'wallet' ? (
                <Check className="h-3 w-3 text-accent" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copy shelter wallet
            </button>
          </div>

          {/* Market */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Market cap</span>
              <span className="font-mono text-base text-white">{launch.market_cap_sol} SOL</span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Curve</span>
              <span className="font-mono text-base text-white">
                {launch.bonding_curve_progress.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Status</span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-white">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-accent" />
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-6 py-5 sm:flex-row">
          <a
            href={`https://pump.fun/coin/${launch.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
          >
            Trade on Pump.fun
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={`https://solscan.io/token/${launch.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-white transition hover:border-line-strong"
          >
            Solscan
            <ExternalLink className="h-3.5 w-3.5 text-muted" />
          </a>
          <button
            type="button"
            onClick={() => copyText(`${window.location.origin}/?token=${launch.mint}`, 'link')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-white transition hover:border-line-strong"
          >
            <Share2 className="h-3.5 w-3.5 text-muted" />
            {copied === 'link' ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};
