import React, { useEffect, useState } from 'react';
import { ArrowRight, Coins, PawPrint, Search, SlidersHorizontal } from 'lucide-react';
import { Charity, Donation, Launch, Tab } from '../types.ts';
import { TokenCard } from '../components/TokenCard.tsx';
import { PetTheCat, PET_STORAGE_KEY } from '../components/PetTheCat.tsx';
import { HeroBowlArtwork } from '../components/HeroBowlArtwork.tsx';
import { CatMark } from '../components/Cat.tsx';
import {
  EmptyState,
  Reveal,
  SectionLabel,
  TokenCardSkeleton,
} from '../components/ui/Primitives.tsx';

interface ExplorePageProps {
  launches: Launch[];
  charities: Charity[];
  donations: Donation[];
  isLoading: boolean;
  onSelectToken: (launch: Launch) => void;
  openLaunchModal: () => void;
  onNavigate?: (tab: Tab) => void;
}

type FilterType = 'newest' | 'featured' | 'top_bps' | 'market_cap';

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'featured', label: 'Featured' },
  { id: 'top_bps', label: 'Top charity share' },
  { id: 'market_cap', label: 'Market cap' },
];

export const ExplorePage: React.FC<ExplorePageProps> = ({
  launches,
  charities,
  donations,
  isLoading,
  onSelectToken,
  openLaunchModal,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('newest');
  const [charityFilter, setCharityFilter] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [petCount, setPetCount] = useState(0);

  // Sync live pet counter with PetTheCat
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PET_STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) setPetCount(stored);
    } catch {
      /* ignore */
    }
    const handlePet = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') setPetCount(detail);
    };
    window.addEventListener('catpad:pet', handlePet);
    return () => window.removeEventListener('catpad:pet', handlePet);
  }, []);

  const totalDonationsSol = charities.reduce((acc, c) => acc + Number(c.total_donations_sol || 0), 0);
  const pendingBowlSol = donations
    .filter((d) => d.status === 'pending')
    .reduce((acc, d) => acc + Number(d.amount_sol || 0), 0);
  const verifiedCharityCount = charities.filter((c) => c.is_verified).length;
  const avgCharityShare = launches.length
    ? Math.round(launches.reduce((acc, l) => acc + l.donation_bps, 0) / launches.length / 100)
    : 0;

  const topFeaturedLaunches = [...launches]
    .sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return (b.bonding_curve_progress ?? 0) - (a.bonding_curve_progress ?? 0);
    })
    .slice(0, 4);

  const filteredLaunches = launches
    .filter((launch) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          launch.name.toLowerCase().includes(q) ||
          launch.symbol.toLowerCase().includes(q) ||
          launch.mint.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (charityFilter !== 'all' && launch.charity_id !== charityFilter) return false;
      if (filterType === 'featured' && !launch.is_featured) return false;
      return true;
    })
    .sort((a, b) => {
      if (filterType === 'top_bps') return b.donation_bps - a.donation_bps;
      if (filterType === 'market_cap') return (b.market_cap_sol ?? -1) - (a.market_cap_sol ?? -1);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const leadCharity = charities[0];

  return (
    <div className="pb-6">
      {/* ---------------------------------------------------------------- HERO */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-10 pt-10 lg:px-8 lg:pt-14">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="hero-fade mb-4">
              <SectionLabel>01 / Memecoins for cat rescues</SectionLabel>
            </div>

            <h1 className="max-w-xl font-grotesk text-[clamp(2.85rem,5.8vw,4.75rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink">
              <span className="hero-line block">Meme coins</span>
              <span className="hero-line hero-line-2 block">that save</span>
              <span className="hero-line hero-line-3 block">cats.</span>
            </h1>

            <p className="hero-fade mt-5 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              Launch on Pump.fun and route a fixed cut of creator fees to a verified feline rescue.
              Immutable on-chain, not a promise.
            </p>

            <div className="hero-fade mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openLaunchModal}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
              >
                Launch a coin
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#live-coins"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-line-strong bg-card px-6 py-3 text-sm font-medium text-ink transition hover:border-ink hover:bg-card-hover"
              >
                Explore live coins
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <HeroBowlArtwork
              inBowlSol={pendingBowlSol}
              sentSol={totalDonationsSol}
              shelterLabel={leadCharity ? `Sent to ${leadCharity.name}` : 'Sent to shelters'}
            />
          </div>
        </div>

        {/* ----------------------------------------------- SUMMARY STATS BAR */}
        <div className="mt-10 rounded-2xl border border-line bg-card px-6 py-5 shadow-[0_8px_32px_-16px_rgba(17,17,17,0.08)]">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              <a
                href="#pet-the-cat"
                aria-label="Jump to pet Kage"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white transition hover:scale-105"
              >
                <CatMark className="h-14 w-14" idle trackPointer gazeRangePx={2.2} />
              </a>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-9">
                <div className="sm:border-r sm:border-line sm:pr-8">
                  <span className="block text-[11px] font-medium text-muted">Pets given</span>
                  <span className="mt-0.5 block font-grotesk text-2xl font-bold text-ink tabular-nums">
                    {petCount.toLocaleString('en-US')}
                  </span>
                  <span className="block text-[11px] text-muted">happy cats</span>
                </div>

                <div className="sm:border-r sm:border-line sm:pr-8">
                  <span className="block text-[11px] font-medium text-muted">
                    Donated to shelters
                  </span>
                  <span className="mt-0.5 block font-grotesk text-2xl font-bold text-ink tabular-nums">
                    {totalDonationsSol.toFixed(1)} SOL
                  </span>
                </div>

                <div className="sm:border-r sm:border-line sm:pr-8">
                  <span className="block text-[11px] font-medium text-muted">
                    Verified shelters
                  </span>
                  <span className="mt-0.5 block font-grotesk text-2xl font-bold text-ink tabular-nums">
                    {verifiedCharityCount}
                  </span>
                </div>

                <div className="sm:border-r sm:border-line sm:pr-8">
                  <span className="block text-[11px] font-medium text-muted">Live coins</span>
                  <span className="mt-0.5 block font-grotesk text-2xl font-bold text-ink tabular-nums">
                    {launches.length}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-muted">
                    Avg charity share
                  </span>
                  <span className="mt-0.5 block font-grotesk text-2xl font-bold text-ink tabular-nums">
                    {avgCharityShare}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------- 02 / CAT ON DUTY + FEATURED */}
      <section className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
        <Reveal>
          <PetTheCat embedded />
        </Reveal>

        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
          ) : topFeaturedLaunches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topFeaturedLaunches.map((launch) => (
                <TokenCard
                  key={launch.id}
                  variant="featured"
                  launch={launch}
                  charity={charities.find((c) => c.id === launch.charity_id)}
                  onSelect={onSelectToken}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Coins className="h-6 w-6" />}
              title="No featured coins yet"
              copy="Launch the first cat rescue memecoin on Pump.fun to appear here."
              actionLabel="Launch a coin"
              onAction={openLaunchModal}
            />
          )}
        </div>
      </section>

      {/* -------------------------------------- 03 / LIVE COINS + BOWL CALLOUT */}
      <section
        id="live-coins"
        className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-10 lg:px-8"
      >
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Left 8 cols: Search, Tabs, Compact Coin Cards */}
          <div className="flex flex-col lg:col-span-8">
            <Reveal>
              <SectionLabel>03 / Live coins</SectionLabel>
              <h2 className="mt-2 font-grotesk text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl">
                On the curve right now
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Every coin below has a locked creator fee split pointing at a verified shelter
                wallet.
              </p>
            </Reveal>

            <Reveal delay={60}>
              <div className="mt-6 flex flex-col gap-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, ticker or mint"
                      aria-label="Search coins"
                      className="w-full rounded-xl border border-line bg-card py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      aria-expanded={filtersOpen}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink sm:hidden"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                    </button>

                    <select
                      value={charityFilter}
                      onChange={(e) => setCharityFilter(e.target.value)}
                      aria-label="Filter by shelter"
                      className="rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm font-medium text-ink focus:border-ink focus:outline-none"
                    >
                      <option value="all">All shelters</option>
                      {charities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  className={`${
                    filtersOpen ? 'flex' : 'hidden'
                  } flex-wrap items-center gap-5 border-b border-line pb-2.5 sm:flex`}
                >
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setFilterType(filter.id)}
                      className={`relative pb-1 text-sm font-medium transition ${
                        filterType === filter.id ? 'text-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {filter.label}
                      {filterType === filter.id && (
                        <span
                          className="absolute inset-x-0 -bottom-2.5 h-0.5 bg-ink"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="mt-6 flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TokenCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredLaunches.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredLaunches.map((launch) => (
                    <TokenCard
                      key={launch.id}
                      variant="compact"
                      launch={launch}
                      charity={charities.find((c) => c.id === launch.charity_id)}
                      onSelect={onSelectToken}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Coins className="h-6 w-6" />}
                  title={launches.length === 0 ? 'No coins launched yet' : 'Nothing matches those filters'}
                  copy={
                    launches.length === 0
                      ? 'Be the first to launch a coin that funds a cat rescue.'
                      : 'Try a different shelter or clear the search.'
                  }
                  actionLabel={launches.length === 0 ? 'Launch the first coin' : undefined}
                  onAction={launches.length === 0 ? openLaunchModal : undefined}
                />
              )}
            </div>
          </div>

          {/* Right 4 cols: Dark Olive Feature Card "Every trade fills the bowl." */}
          <div className="lg:col-span-4">
            <div className="relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#282F26] via-[#21271F] to-[#171B16] p-8 text-white shadow-[0_14px_38px_-16px_rgba(17,17,17,0.4)]">
              <div>
                <PawPrint className="h-6 w-6 text-white/85" aria-hidden="true" />
                <h3 className="mt-4 font-grotesk text-3xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
                  Every trade <br />
                  fills the <span className="text-[#E7B83C]">bowl.</span>
                </h3>
                <p className="mt-4 max-w-[230px] text-sm leading-relaxed text-white/75">
                  Creator fees from every buy and sell help support verified shelters.
                </p>

                <button
                  type="button"
                  onClick={() => (onNavigate ? onNavigate('charities') : undefined)}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F5F4EF] px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Peeking navbar cat with golden eyes in bottom right */}
              <div className="pointer-events-none absolute -bottom-7 right-3 h-32 w-32 -rotate-6">
                <CatMark className="h-full w-full drop-shadow-lg" idle={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------- DARK JOIN THE MOVEMENT BANNER */}
      <section className="mx-auto w-full max-w-7xl px-5 pt-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#09090B] via-[#100C1A] to-[#23143B] px-7 py-10 text-white sm:px-11 sm:py-12">
            {/* Subtle glowing violet cat silhouette outline & orbital sweep on the right */}
            <svg
              viewBox="0 0 420 220"
              className="pointer-events-none absolute -bottom-2 right-0 h-56 w-96 opacity-60"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M-60 220 C40 130 220 75 420 110"
                stroke="#7C3AED"
                strokeOpacity="0.22"
                strokeWidth="1.4"
              />
              <circle cx="290" cy="145" r="125" stroke="#8B5CF6" strokeOpacity="0.24" strokeWidth="1.5" />
              <path
                d="M175 220C175 168 188 122 200 96L194 26L242 68C258 62 282 62 298 68L346 26L340 96C352 122 365 168 365 220"
                fill="#0A0812"
                stroke="#9333EA"
                strokeOpacity="0.65"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>

            <div className="relative z-10 max-w-xl">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">
                Join the movement
              </span>
              <h2 className="mt-2.5 font-grotesk text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Save cats. <span className="text-[#A78BFA]">On-chain.</span>
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/75">
                Launch a meme coin. Help a shelter. Be part of something bigger.
              </p>

              <button
                type="button"
                onClick={openLaunchModal}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-page"
              >
                Launch now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
