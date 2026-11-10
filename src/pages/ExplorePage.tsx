import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Coins, Search, SlidersHorizontal } from 'lucide-react';
import { Launch, Charity } from '../types.ts';
import { TokenCard } from '../components/TokenCard.tsx';
import {
  EmptyState,
  Reveal,
  SectionLabel,
  TokenCardSkeleton,
} from '../components/ui/Primitives.tsx';
import { useSound } from '../context/SoundContext.tsx';
import { BRAND } from '../lib/brand.ts';
import { hasValue } from '../lib/format.ts';

interface ExplorePageProps {
  launches: Launch[];
  charities: Charity[];
  isLoading: boolean;
  onSelectToken: (launch: Launch) => void;
  openLaunchModal: () => void;
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
  isLoading,
  onSelectToken,
  openLaunchModal,
}) => {
  const { muted } = useSound();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('newest');
  const [charityFilter, setCharityFilter] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const videoWrapRef = useRef<HTMLDivElement | null>(null);
  const coinRef = useRef<HTMLImageElement | null>(null);

  // Subtle parallax: the background drifts and the coin moves as you scroll.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (videoWrapRef.current && y < 1200) {
          videoWrapRef.current.style.transform = `translate3d(0, ${y * 0.14}px, 0)`;
        }
        if (coinRef.current && y < 1200) {
          coinRef.current.style.transform = `translate3d(0, ${y * -0.1}px, 0)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const totalDonationsSol = charities.reduce((acc, c) => acc + Number(c.total_donations_sol), 0);
  const verifiedCharityCount = charities.filter((c) => c.is_verified).length;
  const avgCharityShare = launches.length
    ? Math.round(launches.reduce((acc, l) => acc + l.donation_bps, 0) / launches.length / 100)
    : 0;

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
      if (filterType === 'market_cap') return Number(b.market_cap_sol) - Number(a.market_cap_sol);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = [
    { label: 'Donated to shelters', value: `${totalDonationsSol.toFixed(1)} SOL`, show: hasValue(totalDonationsSol) },
    { label: 'Verified shelters', value: String(verifiedCharityCount), show: hasValue(verifiedCharityCount) },
    { label: 'Live coins', value: String(launches.length), show: hasValue(launches.length) },
    { label: 'Avg charity share', value: `${avgCharityShare}%`, show: hasValue(avgCharityShare) },
  ].filter((stat) => stat.show);

  return (
    <div>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative w-full overflow-hidden border-b border-line">
        <div ref={videoWrapRef} className="absolute inset-0 will-change-transform">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${BRAND.assets.heroPoster})` }}
            aria-hidden="true"
          />
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={BRAND.assets.heroVideo}
            poster={BRAND.assets.heroPoster}
            autoPlay
            loop
            muted={muted}
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-7xl flex-col justify-between px-5 pb-10 pt-16 lg:px-8 lg:pt-20">
          <div className="flex flex-1 flex-col justify-center">
            <div className="hero-fade mb-6">
              <SectionLabel>01 / Memecoins for cat rescues</SectionLabel>
            </div>

            <h1 className="max-w-4xl font-grotesk text-[clamp(2.9rem,9vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.045em] text-white">
              <span className="hero-line block">Meme coins</span>
              <span className="hero-line hero-line-2 block">that save</span>
              <span className="hero-line hero-line-3 block text-accent">cats.</span>
            </h1>

            <p className="hero-fade mt-7 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Launch on Pump.fun and route a fixed cut of creator fees to a verified feline rescue.
              Immutable on-chain, not a promise.
            </p>

            <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openLaunchModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent-hover"
              >
                Launch a coin
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#live-coins"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/5"
              >
                Explore live coins
              </a>
            </div>
          </div>

          <div className="mt-12 flex items-end justify-between">
            <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-white/50 sm:flex">
              <span className="h-8 w-px bg-white/25" />
              <span className="scroll-hint inline-block">Scroll</span>
            </div>

            <div className="relative hidden lg:block">
              <img
                ref={coinRef}
                src={BRAND.assets.coin}
                alt=""
                aria-hidden="true"
                className="coin-float h-40 w-40 drop-shadow-[0_20px_60px_rgba(0,0,0,0.55)] xl:h-48 xl:w-48"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- STATS */}
      {stats.length > 0 && (
        <section className="border-b border-line">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 sm:grid-cols-4 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <SectionLabel className="tracking-[0.16em]">{stat.label}</SectionLabel>
                <p className="mt-2 font-mono text-2xl text-white sm:text-3xl">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- LIVE COINS */}
      <section id="live-coins" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-16 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <SectionLabel>02 / Live coins</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                On the curve right now
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Every coin below has a locked creator fee split pointing at a verified shelter wallet.
              </p>
            </div>

            <button
              type="button"
              onClick={openLaunchModal}
              className="hidden items-center gap-2 self-start rounded-lg border border-line-strong px-4 py-2.5 text-sm text-white transition hover:border-white hover:bg-white/5 md:inline-flex"
            >
              Start a launch
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ticker or mint"
                  aria-label="Search coins"
                  className="w-full rounded-lg border border-line bg-card py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  aria-expanded={filtersOpen}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-white sm:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>

                <select
                  value={charityFilter}
                  onChange={(e) => setCharityFilter(e.target.value)}
                  aria-label="Filter by shelter"
                  className="rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
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

            <div className={`${filtersOpen ? 'flex' : 'hidden'} flex-wrap items-center gap-5 sm:flex`}>
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setFilterType(filter.id)}
                  className={`relative pb-1 text-sm transition ${
                    filterType === filter.id ? 'text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  {filter.label}
                  {filterType === filter.id && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredLaunches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLaunches.map((launch) => (
                <TokenCard
                  key={launch.id}
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
      </section>
    </div>
  );
};
