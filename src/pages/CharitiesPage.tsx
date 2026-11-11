import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, ExternalLink, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Charity, Launch } from '../types.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  CharityCardSkeleton,
  EmptyState,
  Reveal,
  SectionLabel,
} from '../components/ui/Primitives.tsx';
import { formatPercent, hasValue, shortAddress } from '../lib/format.ts';

interface CharitiesPageProps {
  charities: Charity[];
  launches: Launch[];
  isLoading: boolean;
  onOpenDonate: (charity: Charity) => void;
  onSelectToken: (launch: Launch) => void;
  openLaunchModal: () => void;
}

export const CharitiesPage: React.FC<CharitiesPageProps> = ({
  charities,
  launches,
  isLoading,
  onOpenDonate,
  onSelectToken,
  openLaunchModal,
}) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalRaisedSol = charities.reduce((sum, c) => sum + Number(c.total_donations_sol), 0);
  const linkedTokenCount = new Set(launches.map((l) => l.charity_id)).size;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast('Could not copy the wallet address', 'error');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
      <Reveal>
        <div className="max-w-3xl">
          <SectionLabel>03 / Verified shelters</SectionLabel>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl">
            The shelters on the other side of the fee split
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Every organisation here is verified manually and controls the Solana wallet it receives to.
            CatPad never custodies funds — fee splits are enforced by on-chain PDAs.
          </p>
        </div>
      </Reveal>

      {(hasValue(totalRaisedSol) || hasValue(charities.length) || hasValue(linkedTokenCount)) && (
        <Reveal delay={60}>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 sm:grid-cols-3">
            {hasValue(totalRaisedSol) && (
              <div>
                <SectionLabel className="tracking-[0.16em]">Given to shelters</SectionLabel>
                <p className="mt-2 font-mono text-2xl text-white sm:text-3xl">
                  {totalRaisedSol.toFixed(2)} SOL
                </p>
              </div>
            )}
            {hasValue(charities.length) && (
              <div>
                <SectionLabel className="tracking-[0.16em]">Verified partners</SectionLabel>
                <p className="mt-2 font-mono text-2xl text-white sm:text-3xl">{charities.length}</p>
              </div>
            )}
            {hasValue(linkedTokenCount) && (
              <div>
                <SectionLabel className="tracking-[0.16em]">Shelters with a live coin</SectionLabel>
                <p className="mt-2 font-mono text-2xl text-white sm:text-3xl">{linkedTokenCount}</p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <SectionLabel>Partners</SectionLabel>
        <button
          type="button"
          onClick={openLaunchModal}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-hover"
        >
          Launch for a shelter
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <CharityCardSkeleton key={i} />)}

        {!isLoading && charities.length === 0 && (
          <div className="md:col-span-2">
            <EmptyState
              icon={<HeartHandshake className="h-6 w-6" />}
              title="No shelters listed yet"
              copy="Verified rescue partners will appear here once they are onboarded."
            />
          </div>
        )}

        {!isLoading &&
          charities.map((charity) => {
            const linkedLaunches = launches.filter((l) => l.charity_id === charity.id);
            const isCopied = copiedId === charity.id;

            return (
              <article key={charity.id} className="flex flex-col rounded-xl border border-line bg-card p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={charity.avatar_url}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 rounded-lg border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-base font-semibold text-white">{charity.name}</h2>
                      {charity.is_verified && (
                        <ShieldCheck className="h-4 w-4 flex-shrink-0 text-accent" aria-label="Verified" />
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {charity.ein_tax_id ? `501(c)(3) EIN ${charity.ein_tax_id}` : 'Verified partner'}
                    </p>
                    <a
                      href={charity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted transition hover:text-white"
                    >
                      {charity.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted">{charity.description}</p>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Receiving wallet
                    </span>
                    <span className="font-mono text-xs text-white">{shortAddress(charity.wallet_address, 6)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(charity.id, charity.wallet_address)}
                      aria-label="Copy wallet address"
                      className="rounded-md border border-line p-1.5 text-muted transition hover:border-line-strong hover:text-white"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <a
                      href={`https://solscan.io/account/${charity.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View wallet on Solscan"
                      className="rounded-md border border-line p-1.5 text-muted transition hover:border-line-strong hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                  <div>
                    <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Total received
                    </span>
                    <span className="font-mono text-lg text-white">
                      {Number(charity.total_donations_sol).toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                      Coins
                    </span>
                    <span className="font-mono text-sm text-white">{linkedLaunches.length}</span>
                  </div>
                </div>

                {linkedLaunches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {linkedLaunches.map((token) => (
                      <button
                        key={token.id}
                        type="button"
                        onClick={() => onSelectToken(token)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-white transition hover:border-accent hover:text-accent"
                      >
                        ${token.symbol}
                        <span className="text-muted">{formatPercent(token.donation_bps)}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onOpenDonate(charity)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium text-white transition hover:border-accent hover:text-accent"
                >
                  Donate SOL directly
                </button>
              </article>
            );
          })}
      </div>
    </div>
  );
};
