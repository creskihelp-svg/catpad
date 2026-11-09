import React from 'react';
import { Cat, Heart, Shield, ExternalLink, Lock } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: 'explore' | 'launch' | 'charities' | 'admin' | 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#090c12] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand Description */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center">
              <Cat className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-white">
              Cat<span className="text-amber-400">Pad</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            The decentralized launchpad for cat memecoins on Solana and Pump.fun. Automated creator trading fee splits are enforced on-chain via immutable PDAs to fund verified feline rescues and no-kill sanctuaries.
          </p>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Non-custodial. Zero seed phrases stored. Protocol-enforced giving.</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Protocol</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button onClick={() => setCurrentTab('explore')} className="hover:text-amber-400 transition">
                Explore Coins
              </button>
            </li>
            <li>
              <button onClick={() => setCurrentTab('charities')} className="hover:text-amber-400 transition">
                Verified Charities & Impact
              </button>
            </li>
            <li>
              <a
                href="https://pump.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition flex items-center space-x-1"
              >
                <span>Pump.fun Protocol</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a
                href="https://solscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition flex items-center space-x-1"
              >
                <span>Solscan Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>

        {/* Governance & Legal */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Governance & Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button onClick={() => setCurrentTab('admin')} className="hover:text-amber-400 transition">
                Admin Portal
              </button>
            </li>
            <li>
              <button onClick={() => setCurrentTab('terms')} className="hover:text-amber-400 transition">
                Terms of Service
              </button>
            </li>
            <li>
              <button onClick={() => setCurrentTab('privacy')} className="hover:text-amber-400 transition">
                Privacy Policy
              </button>
            </li>
            <li>
              <span className="text-xs text-slate-500 font-mono">v1.2.0 • PumpFees Enabled</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>© 2026 CatPad Foundation. Built for feline welfare worldwide.</p>
        <p className="flex items-center space-x-1">
          <span>Made with</span>
          <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
          <span>for every street cat needing rescue</span>
        </p>
      </div>
    </footer>
  );
};
