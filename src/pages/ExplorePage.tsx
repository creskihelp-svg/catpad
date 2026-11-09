import React, { useState } from 'react';
import { Launch, Charity } from '../types.ts';
import { TokenCard } from '../components/TokenCard.tsx';
import { 
  Search, 
  Flame, 
  Heart, 
  Sparkles, 
  Rocket, 
  Filter, 
  TrendingUp, 
  Lock, 
  ShieldCheck,
  Coins
} from 'lucide-react';

interface ExplorePageProps {
  launches: Launch[];
  charities: Charity[];
  onSelectToken: (launch: Launch) => void;
  openLaunchModal: () => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  launches,
  charities,
  onSelectToken,
  openLaunchModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'top_bps' | 'market_cap' | 'newest'>('all');
  const [selectedCharityFilter, setSelectedCharityFilter] = useState<string>('all');

  // Aggregated stats
  const totalDonationsSol = charities.reduce((acc, c) => acc + Number(c.total_donations_sol), 0);
  const totalTokens = launches.length;
  const verifiedCharityCount = charities.filter((c) => c.is_verified).length;

  // Filtered launches
  const filteredLaunches = launches.filter((launch) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = launch.name.toLowerCase().includes(q);
      const matchSymbol = launch.symbol.toLowerCase().includes(q);
      const matchMint = launch.mint.toLowerCase().includes(q);
      if (!matchName && !matchSymbol && !matchMint) return false;
    }

    // Charity filter
    if (selectedCharityFilter !== 'all' && launch.charity_id !== selectedCharityFilter) {
      return false;
    }

    // Tab filter
    if (filterType === 'featured' && !launch.is_featured) return false;
    return true;
  });

  // Sorting
  filteredLaunches.sort((a, b) => {
    if (filterType === 'top_bps') return b.donation_bps - a.donation_bps;
    if (filterType === 'market_cap') return Number(b.market_cap_sol) - Number(a.market_cap_sol);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 border border-slate-800/80 bg-gradient-to-br from-[#131929] via-[#0e1320] to-[#1a1226] text-left">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pump.fun Protocol Integration • Creator Fee Sharing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Memecoins that <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
              Actually Save Cats.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Launch tokens on Pump.fun with automated, immutable creator fee splits directed to verified feline rescues. One-click bundling, zero rugs, verifiable on-chain impact.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={openLaunchModal}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center space-x-2 shadow-xl shadow-amber-500/20 transform active:scale-95 transition cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-slate-950" />
              <span>Launch a Cat Coin</span>
            </button>

            <a
              href="#explore-grid"
              className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-sm flex items-center space-x-2 transition"
            >
              <span>Explore Active Curves</span>
            </a>
          </div>
        </div>

        {/* Protocol Impact Banner */}
        <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 block font-mono">TOTAL DONATIONS</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {totalDonationsSol.toFixed(1)} SOL
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 block font-mono">VERIFIED RESCUES</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-pink-400">
              {verifiedCharityCount} Shelters
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 block font-mono">ACTIVE TOKENS</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {totalTokens} Memecoins
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 block font-mono">FEE ENFORCEMENT</span>
            <span className="text-sm sm:text-base font-bold text-slate-200 flex items-center space-x-1 mt-1">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Immutable PDA</span>
            </span>
          </div>
        </div>
      </div>

      {/* Explore Section: Search & Filters */}
      <div id="explore-grid" className="space-y-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Explore Bonding Curves</h2>
            <p className="text-xs text-slate-400">Live tokens funding feline shelters on Solana</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search name, ticker, or mint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none transition"
              />
            </div>

            {/* Charity Filter Dropdown */}
            <select
              value={selectedCharityFilter}
              onChange={(e) => setSelectedCharityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 focus:border-amber-400 outline-none"
            >
              <option value="all">All Charities</option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Coins
          </button>
          <button
            onClick={() => setFilterType('featured')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
              filterType === 'featured'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Featured</span>
          </button>
          <button
            onClick={() => setFilterType('top_bps')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
              filterType === 'top_bps'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>Top Charity % (BPS)</span>
          </button>
          <button
            onClick={() => setFilterType('market_cap')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
              filterType === 'market_cap'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Highest Market Cap</span>
          </button>
          <button
            onClick={() => setFilterType('newest')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              filterType === 'newest'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Newest Launches
          </button>
        </div>

        {/* Token Grid */}
        {filteredLaunches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredLaunches.map((launch) => {
              const charity = charities.find((c) => c.id === launch.charity_id);
              return (
                <TokenCard
                  key={launch.id}
                  launch={launch}
                  charity={charity}
                  onSelect={onSelectToken}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
            <Coins className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Memecoins Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No coins matched your search criteria. Be the first to launch a token for this charity!
            </p>
            <button
              onClick={openLaunchModal}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Launch First Coin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
