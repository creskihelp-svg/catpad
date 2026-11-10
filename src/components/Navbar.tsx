import React, { useEffect, useState } from 'react';
import { Menu, Volume2, VolumeX, Wallet, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext.tsx';
import { useSound } from '../context/SoundContext.tsx';
import { useNetworkStatus } from '../hooks/useNetworkStatus.ts';
import { ADMIN_WALLETS, BRAND } from '../lib/brand.ts';
import { shortAddress } from '../lib/format.ts';
import { StatusChip } from './ui/Primitives.tsx';
import { WalletModal } from './WalletModal.tsx';
import { Tab } from '../types.ts';

interface NavbarProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  openLaunchModal: () => void;
}

const LINKS: Array<{ tab: Tab; label: string }> = [
  { tab: 'explore', label: 'Coins' },
  { tab: 'charities', label: 'Shelters' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openLaunchModal }) => {
  const { connected, publicKeyString, balanceSol, isConnecting } = useWallet();
  const { muted, toggleMuted } = useSound();
  const { online, network } = useNetworkStatus();

  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let signedIn = false;
    try {
      signedIn = Boolean(localStorage.getItem('catpad_admin_token'));
    } catch {
      signedIn = false;
    }
    setIsAdmin(Boolean(publicKeyString && ADMIN_WALLETS.includes(publicKeyString)) || signedIn);
  }, [publicKeyString]);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentTab]);

  const navClass = (tab: Tab) =>
    `relative inline-flex h-16 items-center text-sm transition ${
      currentTab === tab ? 'text-white' : 'text-muted hover:text-white'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => setCurrentTab('explore')}
            className="flex items-center gap-2.5"
            aria-label={`${BRAND.name} home`}
          >
            <img src={BRAND.assets.logo} alt={BRAND.name} className="h-7 w-auto" />
          </button>

          {/* Desktop links */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <button key={link.tab} type="button" onClick={() => setCurrentTab(link.tab)} className={navClass(link.tab)}>
                {link.label}
                {currentTab === link.tab && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" />
                )}
              </button>
            ))}
            <span className="relative inline-flex h-16 cursor-not-allowed items-center gap-2 text-sm text-muted/60">
              Leaderboard
              <span className="rounded border border-line px-1 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]">
                Soon
              </span>
            </span>
            {isAdmin && (
              <button type="button" onClick={() => setCurrentTab('admin')} className={navClass('admin')}>
                Admin
                {currentTab === 'admin' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" />
                )}
              </button>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <StatusChip online={online} network={network} />

            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? 'Unmute site audio' : 'Mute site audio'}
              aria-pressed={!muted}
              className="hidden rounded-md border border-line p-2 text-muted transition hover:border-line-strong hover:text-white sm:inline-flex"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {connected ? (
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                aria-label="Wallet details"
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs transition hover:border-line-strong"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="font-mono text-white">{balanceSol.toFixed(3)} SOL</span>
                <span className="hidden font-mono text-muted sm:inline">·</span>
                <span className="hidden font-mono text-muted sm:inline">{shortAddress(publicKeyString)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                aria-label="Connect wallet"
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-white transition hover:border-line-strong hover:bg-white/5"
              >
                <Wallet className="h-4 w-4" />
                <span>{isConnecting ? 'Connecting' : 'Connect'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={openLaunchModal}
              className="hidden rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-hover sm:inline-flex"
            >
              Launch
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-md border border-line p-2 text-white transition hover:border-line-strong md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-line bg-black px-5 pb-5 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {LINKS.map((link) => (
                <button
                  key={link.tab}
                  type="button"
                  onClick={() => setCurrentTab(link.tab)}
                  className={`border-b border-line py-3 text-left text-sm ${
                    currentTab === link.tab ? 'text-white' : 'text-muted'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin')}
                  className="border-b border-line py-3 text-left text-sm text-muted"
                >
                  Admin
                </button>
              )}
              <button
                type="button"
                onClick={openLaunchModal}
                className="mt-4 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-black"
              >
                Launch a coin
              </button>
              <button
                type="button"
                onClick={toggleMuted}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm text-muted"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? 'Sound off' : 'Sound on'}
              </button>
            </nav>
          </div>
        )}
      </header>

      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
};
