import React, { useEffect, useState } from 'react';
import { Menu, Volume2, VolumeX, Wallet, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext.tsx';
import { useSound } from '../context/SoundContext.tsx';
import { useNetworkStatus } from '../hooks/useNetworkStatus.ts';
import { ADMIN_WALLETS, BRAND } from '../lib/brand.ts';
import { shortAddress } from '../lib/format.ts';
import { StatusChip } from './ui/Primitives.tsx';
import { CatMark } from './Cat.tsx';
import { WalletModal } from './WalletModal.tsx';
import { Tab } from '../types.ts';

interface NavbarProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  openLaunchModal: () => void;
  hasAdminSession?: boolean;
}

const LINKS: Array<{ tab: Tab; label: string }> = [
  { tab: 'explore', label: 'Coins' },
  { tab: 'charities', label: 'Shelters' },
  { tab: 'transparency', label: 'Receipts' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openLaunchModal,
  hasAdminSession = false,
}) => {
  const { connected, publicKeyString, balanceSol, isConnecting } = useWallet();
  const { muted, toggleMuted } = useSound();
  const { online, network } = useNetworkStatus();

  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = Boolean(publicKeyString && ADMIN_WALLETS.includes(publicKeyString)) || Boolean(hasAdminSession);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentTab]);

  const navClass = (tab: Tab) =>
    `relative inline-flex h-16 items-center text-sm font-medium whitespace-nowrap shrink-0 transition ${
      currentTab === tab ? 'text-ink' : 'text-muted hover:text-ink'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => setCurrentTab('explore')}
            className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap"
            aria-label={`${BRAND.name} home`}
          >
            <CatMark
              className="h-9 w-9 transition duration-300 group-hover:-rotate-3"
              trackPointer
            />
            <span className="font-grotesk text-[17px] font-bold tracking-[-0.03em] text-ink">
              CatPad
            </span>
          </button>

          {/* Desktop links */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <button
                key={link.tab}
                type="button"
                onClick={() => setCurrentTab(link.tab)}
                className={navClass(link.tab)}
              >
                {link.label}
                {currentTab === link.tab && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden="true" />
                )}
              </button>
            ))}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setCurrentTab('admin')}
                className={navClass('admin')}
              >
                Admin
                {currentTab === 'admin' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden="true" />
                )}
              </button>
            )}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2.5">
            <StatusChip online={online} network={network} />

            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? 'Unmute site audio' : 'Mute site audio'}
              aria-pressed={!muted}
              className="hidden rounded-lg p-2 text-muted transition hover:bg-surface hover:text-ink sm:inline-flex"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {connected ? (
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                aria-label="Wallet details"
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-card px-3.5 py-2 text-xs transition hover:border-line-strong"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono font-medium text-ink tabular-nums">{balanceSol.toFixed(3)} SOL</span>
                <span className="hidden font-mono text-muted sm:inline">·</span>
                <span className="hidden font-mono text-muted sm:inline">{shortAddress(publicKeyString)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                aria-label="Connect wallet"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line-strong bg-card px-4 py-2 text-sm font-medium text-ink transition hover:border-ink hover:bg-card-hover"
              >
                <Wallet className="h-4 w-4" />
                <span>{isConnecting ? 'Connecting' : 'Connect'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={openLaunchModal}
              className="hidden shrink-0 whitespace-nowrap rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover sm:inline-flex"
            >
              Launch
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-full border border-line bg-card p-2 text-ink transition hover:border-line-strong md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-line bg-page px-5 pb-5 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {LINKS.map((link) => (
                <button
                  key={link.tab}
                  type="button"
                  onClick={() => setCurrentTab(link.tab)}
                  className={`border-b border-line py-3 text-left text-sm font-medium ${
                    currentTab === link.tab ? 'text-ink' : 'text-muted'
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
                className="mt-4 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white"
              >
                Launch a coin
              </button>
              <button
                type="button"
                onClick={toggleMuted}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-muted"
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
