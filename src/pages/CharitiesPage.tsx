import React, { useState } from 'react';
import { Charity, Launch } from '../types.ts';
import { 
  HeartHandshake, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  Coins, 
  Lock, 
  Heart,
  Globe,
  Rocket
} from 'lucide-react';

interface CharitiesPageProps {
  charities: Charity[];
  launches: Launch[];
  onOpenDonate: (charity: Charity) => void;
  onSelectToken: (launch: Launch) => void;
  openLaunchModal: () => void;
}

export const CharitiesPage: React.FC<CharitiesPageProps> = ({
  charities,
  launches,
  onOpenDonate,
  onSelectToken,
  openLaunchModal,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalRaisedSol = charities.reduce((sum, c) => sum + Number(c.total_donations_sol), 0);

  return (
    <div className="space-y-12 text-left animate-fadeIn">
      {/* Impact Header */}
      <div className="rounded-3xl p-8 sm:p-10 border border-pink-500/20 bg-gradient-to-br from-pink-950/20 via-[#0e1320] to-[#121826]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold mb-3">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>100% Autonomous On-Chain Giving</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white">
            Verified Feline Charities & Direct Impact
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Every charity listed on CatPad undergoes manual on-chain and non-profit verification. When creators launch with CatPad, Pump.fun creator fees are split via immutable Program Derived Addresses (PDAs) directly to these wallets. CatPad never holds custody of user or charity funds.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-400 block">TOTAL VOLUME GIVEN</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {totalRaisedSol.toFixed(2)} SOL
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-slate-400 block">VERIFIED SHELTERS</span>
              <span className="text-2xl font-black text-pink-400 font-mono">
                {charities.length} Non-Profits
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-slate-400 block">CUSTODY MODEL</span>
              <span className="text-sm font-bold text-slate-200 flex items-center space-x-1 mt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Custody (Direct to Wallet)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charities List Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Verified Partners</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              On-Chain Approved
            </span>
          </h2>

          <button
            onClick={openLaunchModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Launch Coin for Charity</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {charities.map((charity) => {
            const linkedLaunches = launches.filter((l) => l.charity_id === charity.id);
            const isCopied = copiedId === charity.id;

            return (
              <div
                key={charity.id}
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-pink-500/40 transition duration-300 flex flex-col justify-between space-y-5"
              >
                <div>
                  {/* Charity Header */}
                  <div className="flex items-start space-x-4">
                    <img
                      src={charity.avatar_url}
                      alt={charity.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-500/30 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-base font-extrabold text-white truncate">{charity.name}</h3>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      </div>

                      {charity.ein_tax_id && (
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          501(c)(3) EIN: {charity.ein_tax_id}
                        </span>
                      )}

                      <a
                        href={charity.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center space-x-1 mt-1 font-mono"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{charity.website.replace('https://', '')}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Mission Description */}
                  <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                    {charity.description}
                  </p>

                  {/* Solana Wallet Address */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-slate-400 block uppercase">Solana Receiving Address</span>
                      <span className="text-slate-300 truncate">{charity.wallet_address}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleCopy(charity.id, charity.wallet_address)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Copy Address"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`https://solscan.io/account/${charity.wallet_address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="View on Solscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Impact Metrics & Actions */}
                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase">Total Donations Raised</span>
                      <span className="text-base font-extrabold font-mono text-emerald-400">
                        {Number(charity.total_donations_sol).toFixed(2)} SOL
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase">Tokens Funding</span>
                      <span className="text-sm font-bold text-slate-200">
                        {linkedLaunches.length} Memecoins
                      </span>
                    </div>
                  </div>

                  {/* Supporting Tokens Pill Carousel */}
                  {linkedLaunches.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400 font-mono">Supporting Coins:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedLaunches.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => onSelectToken(t)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-mono font-bold text-amber-300 flex items-center space-x-1 transition"
                          >
                            <span>${t.symbol}</span>
                            <span className="text-[10px] text-pink-400">({t.donation_bps / 100}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Donate Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenDonate(charity)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-pink-500/20 transition cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      <span>Donate SOL Directly</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
