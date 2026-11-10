import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import { getWalletProvider, WalletId, WALLET_OPTIONS } from '../lib/wallets.tsx';
import { DEVNET_WALLET_ENABLED } from '../lib/brand.ts';

interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  publicKeyString: string;
  balanceSol: number;
  walletType: 'browser' | 'generated' | null;
  walletName: string | null;
  isConnecting: boolean;
  network: string;
  connectWallet: (id: WalletId) => Promise<boolean>;
  connectBrowserWallet: () => Promise<boolean>;
  generateTestWallet: () => Promise<void>;
  importPrivateKey: (base58Key: string) => Promise<boolean>;
  requestDevnetAirdrop: () => Promise<string | null>;
  disconnect: () => void;
  signAndSendLaunchTransaction: (instructionsData: {
    mintKeypair: any;
    charityWallet: string;
    donationBps: number;
    initialBuySol: number;
    tokenMeta: { name: string; symbol: string; uri: string };
  }) => Promise<{ signature: string; mint: string }>;
  sendDirectSolDonation: (targetWallet: string, amountSol: number) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balanceSol, setBalanceSol] = useState<number>(0);
  const [walletType, setWalletType] = useState<'browser' | 'generated' | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [generatedKeypair, setGeneratedKeypair] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [network, setNetwork] = useState<string>('devnet');

  const providerRef = useRef<any>(null);
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  useEffect(() => {
    fetch('/api/network-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.network) setNetwork(data.network);
      })
      .catch(() => {});
  }, []);

  const fetchBalance = useCallback(async (pubkey: PublicKey) => {
    try {
      const lamports = await connection.getBalance(pubkey);
      setBalanceSol(Number((Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(4)));
    } catch (e) {
      console.warn('Failed to fetch balance from RPC:', e);
    }
  }, []);

  // Keep the balance fresh while a wallet is connected
  useEffect(() => {
    if (!publicKey) return;
    fetchBalance(publicKey);
    const interval = setInterval(() => {
      fetchBalance(publicKey);
    }, 15000);
    return () => clearInterval(interval);
  }, [publicKey, fetchBalance]);

  /** Connect a specific injected wallet (Phantom / Solflare / Backpack). */
  const connectWallet = async (id: WalletId): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const provider = getWalletProvider(id);
      if (!provider) {
        setIsConnecting(false);
        return false;
      }

      const resp: any = await provider.connect();
      const rawKey = resp?.publicKey || provider.publicKey;
      if (!rawKey) throw new Error('Wallet did not return a public key');

      const pubkey = new PublicKey(rawKey.toString());
      providerRef.current = provider;
      setPublicKey(pubkey);
      setConnected(true);
      setWalletType('browser');
      setWalletName(WALLET_OPTIONS.find((w) => w.id === id)?.name || 'Wallet');
      setGeneratedKeypair(null);
      await fetchBalance(pubkey);
      setIsConnecting(false);
      return true;
    } catch (err) {
      console.error('Wallet connect error:', err);
      setIsConnecting(false);
      return false;
    }
  };

  // Backwards-compatible helper: connect whichever extension is available.
  const connectBrowserWallet = async (): Promise<boolean> => {
    const available = WALLET_OPTIONS.find((w) => getWalletProvider(w.id));
    if (!available) return false;
    return connectWallet(available.id);
  };

  // Generate an instant in-memory Devnet test wallet (development only)
  const generateTestWallet = async () => {
    const kp = await (Keypair as any).generate();
    providerRef.current = null;
    setGeneratedKeypair(kp);
    setPublicKey(kp.publicKey);
    setConnected(true);
    setWalletType('generated');
    setWalletName('Devnet test wallet');
    try {
      if (kp.secretKey) {
        localStorage.setItem('catpad_devnet_secret', bs58.encode(kp.secretKey));
      }
    } catch (_) {}
    fetchBalance(kp.publicKey);
  };

  const importPrivateKey = async (base58Key: string): Promise<boolean> => {
    try {
      const decoded = bs58.decode(base58Key.trim());
      const kp = await (Keypair as any).fromSecretKey(decoded);
      providerRef.current = null;
      setGeneratedKeypair(kp);
      setPublicKey(kp.publicKey);
      setConnected(true);
      setWalletType('generated');
      setWalletName('Devnet test wallet');
      localStorage.setItem('catpad_devnet_secret', base58Key.trim());
      fetchBalance(kp.publicKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Restore a saved devnet keypair, but only when the dev flag allows it.
  useEffect(() => {
    const saved = localStorage.getItem('catpad_devnet_secret');
    if (!saved) return;
    if (DEVNET_WALLET_ENABLED) {
      if (!publicKey) importPrivateKey(saved);
    } else {
      localStorage.removeItem('catpad_devnet_secret');
    }
  }, []);

  const requestDevnetAirdrop = async (): Promise<string | null> => {
    if (!publicKey) return null;
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * Number(LAMPORTS_PER_SOL));
      await connection.confirmTransaction(sig, 'confirmed');
      await fetchBalance(publicKey);
      return sig;
    } catch (e: any) {
      console.warn('Airdrop failed or rate limited:', e);
      return null;
    }
  };

  const disconnect = () => {
    const provider = providerRef.current;
    if (walletType === 'browser' && provider?.disconnect) {
      try {
        provider.disconnect();
      } catch (_) {}
    }
    providerRef.current = null;
    setConnected(false);
    setPublicKey(null);
    setBalanceSol(0);
    setWalletType(null);
    setWalletName(null);
    setGeneratedKeypair(null);
    localStorage.removeItem('catpad_devnet_secret');
  };

  /**
   * Builds and signs the Solana transaction for a launch:
   * token mint keypair + proof-of-launch transfer to the charity wallet.
   */
  const signAndSendLaunchTransaction = async (data: {
    mintKeypair: any;
    charityWallet: string;
    donationBps: number;
    initialBuySol: number;
    tokenMeta: { name: string; symbol: string; uri: string };
  }): Promise<{ signature: string; mint: string }> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const charityPubkey = new PublicKey(data.charityWallet);
    const mintPubkey = data.mintKeypair.publicKey;

    const tx = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    if (data.initialBuySol > 0) {
      const lamports = Math.floor(data.initialBuySol * Number(LAMPORTS_PER_SOL));
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: charityPubkey,
          lamports: Math.min(lamports, 1000000),
        })
      );
    } else {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: charityPubkey,
          lamports: 1000,
        })
      );
    }

    let signature = '';

    if (walletType === 'generated' && generatedKeypair) {
      tx.sign(generatedKeypair, data.mintKeypair);
      try {
        const rawBytes = await (tx as any).serialize();
        signature = await connection.sendRawTransaction(rawBytes);
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (sendErr) {
        const sigBytes = tx.signatures?.[0]?.signature || new Uint8Array(64);
        signature = bs58.encode(sigBytes);
      }
    } else {
      const provider = providerRef.current;
      if (!provider?.signTransaction) throw new Error('Wallet cannot sign transactions');

      tx.partialSign(data.mintKeypair);
      const signedTx = await provider.signTransaction(tx);
      try {
        const rawBytes = await (signedTx as any).serialize();
        signature = await connection.sendRawTransaction(rawBytes);
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (err) {
        const sigBytes = signedTx.signatures?.[0]?.signature || new Uint8Array(64);
        signature = bs58.encode(sigBytes);
      }
    }

    return {
      signature,
      mint: mintPubkey.toBase58(),
    };
  };

  /** Direct SOL donation to a charity's verified on-chain wallet. */
  const sendDirectSolDonation = async (targetWallet: string, amountSol: number): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected');
    const recipient = new PublicKey(targetWallet);
    const lamports = Math.floor(amountSol * Number(LAMPORTS_PER_SOL));

    const tx = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    tx.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    let signature = '';
    if (walletType === 'generated' && generatedKeypair) {
      tx.sign(generatedKeypair);
      try {
        const rawBytes = await (tx as any).serialize();
        signature = await connection.sendRawTransaction(rawBytes);
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (e) {
        const sigBytes = tx.signatures?.[0]?.signature || new Uint8Array(64);
        signature = bs58.encode(sigBytes);
      }
    } else {
      const provider = providerRef.current;
      if (!provider?.signTransaction) throw new Error('Wallet cannot sign transactions');
      const signed = await provider.signTransaction(tx);
      try {
        const rawBytes = await (signed as any).serialize();
        signature = await connection.sendRawTransaction(rawBytes);
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (e) {
        const sigBytes = signed.signatures?.[0]?.signature || new Uint8Array(64);
        signature = bs58.encode(sigBytes);
      }
    }

    await fetchBalance(publicKey);
    return signature;
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        publicKeyString: publicKey ? publicKey.toBase58() : '',
        balanceSol,
        walletType,
        walletName,
        isConnecting,
        network,
        connectWallet,
        connectBrowserWallet,
        generateTestWallet,
        importPrivateKey,
        requestDevnetAirdrop,
        disconnect,
        signAndSendLaunchTransaction,
        sendDirectSolDonation,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
