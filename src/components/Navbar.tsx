import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext.tsx';
import { 
  Cat, 
  Rocket, 
  HeartHandshake, 
  ShieldCheck, 
  Wallet, 
  ExternalLink, 
  Copy, 
  Check, 
  Coins, 
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronDown,
  X
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'explore' | 'launch' | 'charities' | 'admin' | 'terms' | 'privacy';
  setCurrentTab: (tab: 'explore' | 'launch' | 'charities' | 'admin' | 'terms' | 'privacy') => void;
  openLaunchModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openLaunchModal }) => {
  const { 
    connected, 
    publicKeyString, 
    balanceSol, 
    walletType, 
    isConnecting, 
    network,
    connectBrowserWallet, 
    generateTestWallet, 
    requestDevnetAirdrop, 
    disconnect 
  } = useWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropLoading, setAirdropLoading] = useState(false);

  const handleCopy = () => {
    if (!publicKeyString) return;
    navigator.clipboard.writeText(publicKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAirdrop = async () => {
    setAirdropLoading(true);
    await requestDevnetAirdrop();
    setAirdropLoading(false);
  };

  const truncatedAddress = publicKeyString 
    ? `${publicKeyString.slice(0, 4)}...${publicKeyString.slice(-4)}`
    : '';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0e14]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('explore')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              <Cat className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
                  Cat<span className="text-amber-400">Pad</span>
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    pump.fun
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Memecoins Funding Cat Rescues</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => setCurrentTab('explore')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'explore'
                  ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Explore Coins
            </button>
            <button
              onClick={() => setCurrentTab('charities')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                currentTab === 'charities'
                  ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-pink-400" />
              <span>Charities & Impact</span>
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                currentTab === 'admin'
                  ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Action Area: Launch Button, Network & Wallet */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Quick Launch CTA */}
            <button
              onClick={openLaunchModal}
              className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-slate-950" />
              <span>Launch Coin</span>
            </button>

            {/* Solana Network Status Pill */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="capitalize">{network}</span>
            </div>

            {/* Wallet Connect / Account Info */}
            {!connected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white shadow-sm transition cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/40 text-xs font-medium text-slate-200 transition cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="font-mono text-amber-400 font-bold">{balanceSol} SOL</span>
                  <span className="text-slate-400 font-mono hidden sm:inline">| {truncatedAddress}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 bg-[#0d111a] py-2 px-2 text-xs">
          <button
            onClick={() => setCurrentTab('explore')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              currentTab === 'explore' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <span>Explore</span>
          </button>
          <button
            onClick={openLaunchModal}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Launch</span>
          </button>
          <button
            onClick={() => setCurrentTab('charities')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              currentTab === 'charities' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <span>Impact</span>
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              currentTab === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* Wallet Selection & Management Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#121826] border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowWalletModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {!connected ? (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Connect Solana Wallet</h3>
                    <p className="text-xs text-slate-400">Launch memecoins or donate directly</p>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  {/* Option 1: Browser Extension */}
                  <button
                    onClick={async () => {
                      const ok = await connectBrowserWallet();
                      if (ok) setShowWalletModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/40 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-xs">
                        👻
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                          Phantom / Solflare Extension
                        </div>
                        <div className="text-xs text-slate-400">Standard Solana browser wallet</div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-400 font-semibold group-hover:translate-x-0.5 transition">
                      Connect →
                    </span>
                  </button>

                  {/* Option 2: Instant Devnet Test Wallet */}
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Instant Testing Mode
                    </div>
                    <button
                      onClick={() => {
                        generateTestWallet();
                        setShowWalletModal(false);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-200">
                            Generate Devnet Test Wallet
                          </div>
                          <div className="text-xs text-slate-400">
                            Instant in-browser wallet with test SOL
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono">
                        1-Click
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>Connected Wallet</span>
                    {walletType === 'generated' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                        Devnet Test Keypair
                      </span>
                    )}
                  </h3>
                </div>

                {/* Account Details Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Address</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-mono transition"
                    >
                      <span>{truncatedAddress}</span>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400">Available Balance</span>
                    <span className="text-base font-bold font-mono text-emerald-400">{balanceSol} SOL</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400">Network</span>
                    <span className="text-xs font-mono text-slate-300 uppercase">{network}</span>
                  </div>
                </div>

                {/* Quick Devnet Faucet Airdrop */}
                <div className="space-y-3">
                  <button
                    onClick={handleAirdrop}
                    disabled={airdropLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sm font-semibold text-white transition disabled:opacity-50"
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>{airdropLoading ? 'Requesting Test SOL...' : 'Request 1 Devnet SOL'}</span>
                  </button>

                  <a
                    href={`https://solscan.io/account/${publicKeyString}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                  >
                    <span>View on Solscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      disconnect();
                      setShowWalletModal(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-sm font-semibold transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
