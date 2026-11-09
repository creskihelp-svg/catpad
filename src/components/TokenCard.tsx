import React, { useState } from 'react';
import { Launch, Charity } from '../types.ts';
import { ExternalLink, Lock, Flame, Heart, Copy, Check, Share2 } from 'lucide-react';

interface TokenCardProps {
  launch: Launch;
  charity?: Charity;
  onSelect: (launch: Launch) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ launch, charity, onSelect }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMint = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(launch.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const donationPercent = (launch.donation_bps / 100).toFixed(0);

  return (
    <div
      onClick={() => onSelect(launch)}
      className="group relative rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0e1320]/90 border border-slate-800/80 hover:border-amber-500/40 p-4 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between"
    >
      {/* Featured / Top Donor Ribbon */}
      {launch.is_featured && (
        <div className="absolute -top-2.5 right-4 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-black text-slate-950 uppercase tracking-wider flex items-center space-x-1 shadow-md shadow-amber-500/30">
          <Flame className="w-3 h-3 fill-slate-950" />
          <span>Featured</span>
        </div>
      )}

      <div>
        {/* Token Header: Avatar + Ticker */}
        <div className="flex items-start space-x-3.5 mb-3.5">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700/60 group-hover:border-amber-400/50 transition">
            <img
              src={launch.image_url}
              alt={launch.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base text-white truncate group-hover:text-amber-300 transition">
                {launch.name}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                ${launch.symbol}
              </span>
              <button
                onClick={handleCopyMint}
                title="Copy Mint Address"
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition"
              >
                <span>{launch.mint.slice(0, 4)}...{launch.mint.slice(-4)}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Charity Donation Fee Share Badge */}
        <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-pink-500/20 flex items-center justify-center text-[10px]">
              {charity?.avatar_url ? (
                <img src={charity.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                '🐾'
              )}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-pink-300 truncate block">
                {charity?.name || 'Cat Charity'}
              </span>
              <span className="text-[10px] text-slate-400">Verified Beneficiary</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs font-black font-mono">
            <Heart className="w-3 h-3 fill-pink-400" />
            <span>{donationPercent}%</span>
            {launch.is_immutable && (
              <span title="Fee-share is on-chain immutable" className="ml-0.5">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
              </span>
            )}
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-slate-300 line-clamp-2 mb-3.5 leading-relaxed">
          {launch.description}
        </p>
      </div>

      {/* Bonding Curve Progress Bar */}
      <div>
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">Bonding Curve</span>
            <span className="font-bold text-slate-200">{launch.bonding_curve_progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(launch.bonding_curve_progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Card Footer: Market Cap & Pump.fun link */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Market Cap</span>
            <span className="text-xs font-mono font-bold text-slate-200">{launch.market_cap_sol} SOL</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <a
              href={`https://pump.fun/coin/${launch.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-amber-300 flex items-center space-x-1 transition"
            >
              <span>pump.fun</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
