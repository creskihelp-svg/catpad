import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext.tsx';
import { Charity } from '../types.ts';
import { 
  X, 
  Heart, 
  ShieldCheck, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';

interface DirectDonationModalProps {
  charity: Charity | null;
  isOpen: boolean;
  onClose: () => void;
  onDonationSuccess: (amountSol: number) => void;
}

export const DirectDonationModal: React.FC<DirectDonationModalProps> = ({
  charity,
  isOpen,
  onClose,
  onDonationSuccess,
}) => {
  const { connected, balanceSol, sendDirectSolDonation, connectBrowserWallet, generateTestWallet } = useWallet();

  const [amount, setAmount] = useState<number>(0.25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successTx, setSuccessTx] = useState<string | null>(null);

  if (!isOpen || !charity) return null;

  const handleDonate = async () => {
    if (!connected) {
      setErrorText('Please connect your Solana wallet first');
      return;
    }

    if (amount <= 0) {
      setErrorText('Please enter a valid donation amount in SOL');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText('');

      const signature = await sendDirectSolDonation(charity.wallet_address, amount);

      // Record on server
      await fetch('/api/donations/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charityId: charity.id,
          amountSol: amount,
          txSignature: signature,
        }),
      });

      setSuccessTx(signature);
      onDonationSuccess(amount);
    } catch (err: any) {
      setErrorText(err.message || 'Donation transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#111624] border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!successTx ? (
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={charity.avatar_url}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover border border-pink-500/30"
              />
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                  <span>Donate to {charity.name}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {charity.wallet_address.slice(0, 6)}...{charity.wallet_address.slice(-6)}
                </span>
              </div>
            </div>

            {errorText && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Donation Amount (SOL)</span>
                <span className="text-slate-400 font-mono">Balance: {balanceSol} SOL</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-mono font-bold text-white outline-none focus:border-pink-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">SOL</span>
              </div>

              {/* Quick preset buttons */}
              <div className="flex gap-2 pt-1">
                {[0.1, 0.25, 0.5, 1.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      amount === preset
                        ? 'bg-pink-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset} SOL
                  </button>
                ))}
              </div>
            </div>

            {!connected ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 text-center mb-2">Connect wallet to send donation:</p>
                <div className="flex gap-2">
                  <button
                    onClick={connectBrowserWallet}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Phantom / Solflare
                  </button>
                  <button
                    onClick={generateTestWallet}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    Instant Test Wallet
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleDonate}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 transition cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>{isSubmitting ? 'Confirming On-Chain...' : `Donate ${amount} SOL`}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Donation Confirmed!</h3>
              <p className="text-xs text-slate-300 mt-1">
                You sent <strong className="text-amber-400">{amount} SOL</strong> directly to {charity.name}.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 truncate">
              Tx: {successTx}
            </div>

            <a
              href={`https://solscan.io/tx/${successTx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-amber-400 hover:underline font-mono"
            >
              <span>View On Solscan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
