import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, HeartHandshake, ShieldCheck, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Charity } from '../types.ts';
import { DEVNET_WALLET_ENABLED } from '../lib/brand.ts';
import { shortAddress } from '../lib/format.ts';
import { Spinner } from './ui/Primitives.tsx';

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
  const { connected, balanceSol, sendDirectSolDonation, generateTestWallet } = useWallet();
  const { toast } = useToast();

  const [amount, setAmount] = useState<number>(0.25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successTx, setSuccessTx] = useState<string | null>(null);

  if (!isOpen || !charity) return null;

  const handleDonate = async () => {
    if (amount <= 0) {
      setErrorText('Enter a donation amount above zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText('');

      const signature = await sendDirectSolDonation(charity.wallet_address, amount);

      await fetch('/api/donations/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charityId: charity.id, amountSol: amount, txSignature: signature }),
      });

      setSuccessTx(signature);
      onDonationSuccess(amount);
      toast(`Donated ${amount} SOL to ${charity.name}`, 'success');
    } catch (err: any) {
      const message = err?.message || 'The donation transaction failed';
      setErrorText(message);
      toast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line bg-card p-6">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={charity.avatar_url} alt="" className="h-10 w-10 rounded-lg border border-line object-cover" />
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                Donate to {charity.name}
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              </h2>
              <p className="font-mono text-[10px] text-muted">{shortAddress(charity.wallet_address, 5)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!successTx ? (
          <>
            {errorText && (
              <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-white">
                {errorText}
              </p>
            )}

            <div className="rounded-lg border border-line bg-surface px-4 py-4">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="donation-amount" className="text-muted">
                  Amount
                </label>
                <span className="font-mono text-[10px] text-muted">Balance {balanceSol.toFixed(4)} SOL</span>
              </div>

              <div className="relative mt-2">
                <input
                  id="donation-amount"
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-line bg-black px-3 py-3 pr-14 font-mono text-lg text-white focus:border-accent focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">SOL</span>
              </div>

              <div className="mt-3 flex gap-2">
                {[0.1, 0.25, 0.5, 1].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                      amount === preset ? 'border-accent text-accent' : 'border-line text-muted hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {!connected ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted">Connect a wallet to send this donation.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-accent-hover"
                  >
                    Connect from the nav
                  </button>
                  {DEVNET_WALLET_ENABLED && (
                    <button
                      type="button"
                      onClick={async () => {
                        await generateTestWallet();
                        toast('Devnet test wallet ready', 'success');
                      }}
                      className="flex-1 rounded-lg border border-line px-3 py-2.5 text-xs text-white transition hover:border-line-strong"
                    >
                      Devnet wallet
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDonate}
                disabled={isSubmitting}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:opacity-50"
              >
                {isSubmitting ? <Spinner className="h-4 w-4 border-black border-t-transparent" /> : <HeartHandshake className="h-4 w-4" />}
                {isSubmitting ? 'Confirming...' : `Donate ${amount} SOL`}
              </button>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Sent straight to the shelter's wallet. CatPad never holds the funds.
            </p>
          </>
        ) : (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-accent" />
            <div>
              <h3 className="text-base font-semibold text-white">Donation confirmed</h3>
              <p className="mt-1 text-xs text-muted">
                {amount} SOL sent directly to {charity.name}.
              </p>
            </div>
            <p className="truncate rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[10px] text-muted">
              {successTx}
            </p>
            <a
              href={`https://solscan.io/tx/${successTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-white"
            >
              View on Solscan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-line px-4 py-2.5 text-xs text-white transition hover:border-line-strong"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
