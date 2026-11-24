import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Lock } from 'lucide-react';
import { Launch, Charity } from '../types.ts';
import { BRAND } from '../lib/brand.ts';
import { formatPercent } from '../lib/format.ts';

interface TokenCardProps {
  launch: Launch;
  charity?: Charity;
  onSelect: (launch: Launch) => void;
  variant?: 'featured' | 'compact';
}

export const TokenCard: React.FC<TokenCardProps> = ({
  launch,
  charity,
  onSelect,
  variant = 'featured',
}) => {
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

  const curvePct = launch.bonding_curve_progress ?? 0;

  if (variant === 'compact') {
    return (
      <article
        onClick={() => onSelect(launch)}
        className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-card p-4 transition duration-200 hover:border-line-strong hover:bg-card-hover hover:shadow-[0_6px_20px_-10px_rgba(17,17,17,0.1)]"
      >
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
            <img
              src={launch.image_url}
              alt={launch.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND.assets.coin;
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-ink">{launch.name}</h3>
            <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
              ${launch.symbol}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block font-mono text-sm font-bold text-ink tabular-nums">
              {launch.market_cap_sol === null ? '—' : `${launch.market_cap_sol} SOL`}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 tabular-nums">
              {formatPercent(launch.donation_bps)} shelter cut
              {launch.is_immutable && <Lock className="h-2.5 w-2.5 text-muted" />}
            </span>
          </div>

          {/* Subtle clean curve sparkline indicator */}
          <svg
            viewBox="0 0 44 20"
            className="h-5 w-11 shrink-0 text-emerald-600"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 17L11 12L19 14L29 6L36 8L42 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="truncate text-[11px] text-muted">
            {charity?.name || 'Verified shelter'}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-page px-3 py-1 text-xs font-medium text-ink transition group-hover:border-ink group-hover:bg-ink group-hover:text-white">
            Trade
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </article>
    );
  }

  // Featured 4-column card matching section 02 of the reference design
  return (
    <article
      onClick={() => onSelect(launch)}
      className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-line bg-card p-5 transition duration-200 hover:border-line-strong hover:bg-card-hover hover:shadow-[0_10px_28px_-14px_rgba(17,17,17,0.12)]"
    >
      <div>
        <div className="mb-3.5 flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
            <img
              src={launch.image_url}
              alt={launch.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND.assets.coin;
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <a
              href={`/coin/${launch.mint}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(launch);
              }}
              className="block truncate text-[15px] font-bold text-ink hover:underline"
            >
              {launch.name}
            </a>

            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                ${launch.symbol}
              </span>
              <button
                type="button"
                onClick={handleCopyMint}
                title="Copy mint address"
                aria-label="Copy mint address"
                className="inline-flex items-center text-muted transition hover:text-ink"
              >
                {copied ? <Check className="h-3 w-3 text-ink" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted">{launch.description}</p>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${Math.min(Math.max(curvePct, 0), 100)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-semibold text-ink tabular-nums">
            {launch.bonding_curve_progress === null ? '—' : `${Math.round(curvePct)}%`}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] text-muted">
            {formatPercent(launch.donation_bps)} → {charity?.name || 'Shelter'}
          </span>

          <a
            href={`https://pump.fun/coin/${launch.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-page px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-ink hover:bg-ink hover:text-white"
          >
            Trade
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
