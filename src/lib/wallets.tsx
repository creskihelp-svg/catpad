import React from 'react';

/**
 * Wallet adapters. CatPad talks to the injected providers directly so we can
 * offer one row per wallet (Phantom, Solflare, Backpack) and show detection
 * state without pulling in a wallet-adapter dependency.
 */

export type WalletId = 'phantom' | 'solflare' | 'backpack';

export interface InjectedProvider {
  connect: (options?: any) => Promise<{ publicKey?: any } | void>;
  disconnect?: () => Promise<void> | void;
  signTransaction?: (tx: any) => Promise<any>;
  publicKey?: any;
}

export interface WalletOption {
  id: WalletId;
  name: string;
  installUrl: string;
}

export const WALLET_OPTIONS: WalletOption[] = [
  { id: 'phantom', name: 'Phantom', installUrl: 'https://phantom.app/download' },
  { id: 'solflare', name: 'Solflare', installUrl: 'https://solflare.com/download' },
  { id: 'backpack', name: 'Backpack', installUrl: 'https://backpack.app/download' },
];

/** Returns the injected provider for a wallet, if this browser has it. */
export const getWalletProvider = (id: WalletId): InjectedProvider | null => {
  const w = window as any;
  if (id === 'phantom') {
    const provider = w.phantom?.solana || w.solana;
    return provider && provider.isPhantom !== false ? provider : null;
  }
  if (id === 'solflare') {
    const provider = w.solflare || w.solana;
    return provider && provider.isSolflare !== false ? provider : null;
  }
  if (id === 'backpack') {
    return w.backpack || null;
  }
  return null;
};

export const isWalletDetected = (id: WalletId) => Boolean(getWalletProvider(id));

/** Inline vector marks — flat, single colour, no emoji or external assets. */
export const WalletLogo: React.FC<{ id: WalletId; className?: string }> = ({ id, className = 'w-6 h-6' }) => {
  if (id === 'phantom') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
        <path d="M12 2.4c-5.1 0-9.2 4.1-9.2 9.2v6.1c0 1.4 1.7 2.1 2.7 1.1l1.5-1.5c.4-.4 1-.4 1.4 0l1.4 1.5c.4.4 1.1.4 1.5 0l1.4-1.5c.4-.4 1-.4 1.4 0l1.4 1.5c.4.4 1.1.4 1.5 0l1.4-1.5c.4-.4 1-.4 1.4 0l1.5 1.5c1 1 2.7.3 2.7-1.1v-6.1c0-5.1-4.1-9.2-9-9.2Z" />
        <circle cx="8.6" cy="11.1" r="1.45" fill="#000" />
        <circle cx="15.4" cy="11.1" r="1.45" fill="#000" />
      </svg>
    );
  }

  if (id === 'solflare') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
        <circle cx="12" cy="12" r="4.6" />
        <path d="M11 1h2v3.4h-2zM11 19.6h2V23h-2zM1 11h3.4v2H1zM19.6 11H23v2h-3.4zM4.2 5.6l1.4-1.4 2.4 2.4-1.4 1.4zM16 17.4l1.4-1.4 2.4 2.4-1.4 1.4zM5.6 19.8l-1.4-1.4 2.4-2.4 1.4 1.4zM17.4 8l-1.4-1.4 2.4-2.4 1.4 1.4z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M8.2 6.4a3.8 3.8 0 0 1 7.6 0v1.4h-2.1V6.4a1.7 1.7 0 0 0-3.4 0v1.4H8.2V6.4Z" />
      <path d="M4.6 8.6A2.6 2.6 0 0 1 7.2 6h9.6a2.6 2.6 0 0 1 2.6 2.6v8.8A2.6 2.6 0 0 1 16.8 20H7.2a2.6 2.6 0 0 1-2.6-2.6V8.6Zm6.1 3.1v2.2h2.6v-2.2h-2.6Z" />
    </svg>
  );
};
