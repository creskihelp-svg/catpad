import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Lock } from 'lucide-react';
import { Launch, Charity } from '../types.ts';
import { BRAND } from '../lib/brand.ts';
import { formatPercent, shortAddress } from '../lib/format.ts';

interface TokenCardProps {
  launch: Launch;
  charity?: Charity;
  onSelect: (launch: Launch) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ launch, charity, onSelect }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(launch.mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <article
      onClick={() => onSelect(launch)}
      className="group flex cursor-pointer flex-col justify-between rounded-xl border border-line bg-card p-4 transition duration-200 hover:border-line-strong hover:bg-card-hover"
    >
      <div>
        <div className="mb-4 flex items-start gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
            <img
              src={launch.image_url}
              alt={launch.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND.assets.coin;
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{launch.name}</h3>
              {launch.is_featured && (
                <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">
                  Featured
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                ${launch.symbol}
              </span>
              <button
                type="button"
                onClick={handleCopyMint}
                title="Copy mint address"
                className="flex items-center gap-1 font-mono text-[10px] text-muted transition hover:text-white"
              >
                {shortAddress(launch.mint)}
                {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted">{launch.description}</p>

        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
          <span className="min-w-0 truncate text-[11px] text-muted">
            {charity?.name || 'Verified shelter'}
          </span>
          <span className="flex flex-shrink-0 items-center gap-1 font-mono text-[11px] text-accent">
            {formatPercent(launch.donation_bps)}
            {launch.is_immutable && <Lock className="h-3 w-3 text-muted" aria-label="Immutable fee share" />}
          </span>
        </div>
      </div>

      <div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            <span>Curve</span>
            <span className="text-white">{launch.bonding_curve_progress.toFixed(1)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.min(Math.max(launch.bonding_curve_progress, 0), 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <div>
            <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Market cap
            </span>
            <span className="font-mono text-sm text-white">{launch.market_cap_sol} SOL</span>
          </div>

          <a
            href={`https://pump.fun/coin/${launch.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-line-strong hover:text-white"
          >
            Trade
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
