import React, { useState } from 'react';
import { Launch, Charity } from '../types.ts';
import { 
  X, 
  ExternalLink, 
  Lock, 
  Copy, 
  Check, 
  Heart, 
  Share2, 
  ShieldCheck, 
  Globe, 
  Send, 
  Sparkles,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

interface TokenDetailModalProps {
  launch: Launch | null;
  charity?: Charity;
  onClose: () => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ launch, charity, onClose }) => {
  if (!launch) return null;

  const [copiedMint, setCopiedMint] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const donationPercent = (launch.donation_bps / 100).toFixed(0);
  const ogImageUrl = `/api/og?mint=${launch.mint}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111624] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Photo & Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-amber-500/30 flex-shrink-0 shadow-lg">
            <img
              src={launch.image_url}
              alt={launch.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-white truncate">{launch.name}</h2>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                ${launch.symbol}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center space-x-2">
              <span>Mint:</span>
              <button
                onClick={() => copyText(launch.mint, setCopiedMint)}
                className="text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <span>{launch.mint}</span>
                {copiedMint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-3 mt-3">
              {launch.twitter && (
                <a
                  href={launch.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Twitter / X"
                >
                  <span className="text-xs font-bold px-1">𝕏</span>
                </a>
              )}
              {launch.telegram && (
                <a
                  href={launch.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Telegram"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              )}
              {launch.website && (
                <a
                  href={launch.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Website"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Token Description */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
          <p className="text-sm text-slate-200 leading-relaxed">{launch.description}</p>
        </div>

        {/* Verified Charity Beneficiary & Fee-Sharing Architecture */}
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-pink-950/20 via-slate-900/90 to-purple-950/20 border border-pink-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Verified Feline Beneficiary
              </h3>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold font-mono border border-pink-500/40">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>{donationPercent}% ({launch.donation_bps} BPS) Irrevocable</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block mb-1">Charity Organization</span>
              <span className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>{charity?.name || 'Cat Sanctuary'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </span>
              {charity?.ein_tax_id && (
                <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                  501(c)(3) EIN: {charity.ein_tax_id}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block mb-1">Charity Solana Wallet</span>
              <button
                onClick={() => charity && copyText(charity.wallet_address, setCopiedWallet)}
                className="text-xs font-mono text-pink-300 hover:text-pink-200 flex items-center space-x-1 truncate max-w-full"
              >
                <span className="truncate">{charity?.wallet_address || 'Verified PDA'}</span>
                {copiedWallet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* On-Chain Fee Sharing Protocol Specs */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 text-[11px] font-mono space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>PumpFees Program:</span>
              <span className="text-slate-300">pfeeUxB6jkeY...jVZ</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sharing Config PDA:</span>
              <span className="text-emerald-400 truncate max-w-[200px]">{launch.config_pda || 'PDA Created'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Immutability Status:</span>
              <span className="text-emerald-400 font-bold">Locked (Non-revocable by creator)</span>
            </div>
          </div>
        </div>

        {/* Live Market & Bonding Curve Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Market Cap</span>
            <span className="text-base font-bold font-mono text-white">{launch.market_cap_sol} SOL</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Bonding Curve</span>
            <span className="text-base font-bold font-mono text-amber-400">{launch.bonding_curve_progress.toFixed(1)}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block">Status</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>On-Chain Active</span>
            </span>
          </div>
        </div>

        {/* Action Buttons: Trade on Pump.fun, Solscan, Share */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href={`https://pump.fun/coin/${launch.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition"
          >
            <span>Trade on Pump.fun</span>
            <ExternalLink className="w-4 h-4 text-slate-950" />
          </a>

          <a
            href={`https://solscan.io/token/${launch.mint}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition border border-slate-700"
          >
            <span>Solscan</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}/?token=${launch.mint}`;
              copyText(shareUrl, setCopiedShare);
            }}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition border border-slate-700 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{copiedShare ? 'Copied Link!' : 'Share'}</span>
          </button>
        </div>

        {/* Dynamic OpenGraph Social Card Preview */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Dynamic Social Card (OG Image)</span>
            </span>
            <a
              href={ogImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline flex items-center space-x-1 font-mono"
            >
              <span>View /api/og</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-800 max-h-36 bg-slate-950 flex items-center justify-center">
            <img src={ogImageUrl} alt="OpenGraph Card Preview" className="w-full h-auto object-cover" />
          </div>
        </div>

      </div>
    </div>
  );
};
