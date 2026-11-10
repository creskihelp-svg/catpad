import React, { useMemo, useRef, useState } from 'react';
import { Keypair } from '@solana/web3.js';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Lock,
  Rocket,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Charity, Launch } from '../types.ts';
import { BRAND, DEVNET_WALLET_ENABLED } from '../lib/brand.ts';
import { formatPercent, shortAddress } from '../lib/format.ts';
import { Spinner } from './ui/Primitives.tsx';
import { WalletModal } from './WalletModal.tsx';

interface CreateLaunchModalProps {
  charities: Charity[];
  isOpen: boolean;
  onClose: () => void;
  onLaunchSuccess: (newLaunch: Launch) => void;
}

const STEPS = [
  { id: 1, label: 'Token' },
  { id: 2, label: 'Shelter' },
  { id: 3, label: 'Review' },
];

const LIMITS = { name: 32, symbol: 10, description: 280 };
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const Counter: React.FC<{ value: number; max: number }> = ({ value, max }) => (
  <span className={`font-mono text-[10px] ${value > max ? 'text-accent' : 'text-muted'}`}>
    {value}/{max}
  </span>
);

export const CreateLaunchModal: React.FC<CreateLaunchModalProps> = ({
  charities,
  isOpen,
  onClose,
  onLaunchSuccess,
}) => {
  const { connected, publicKeyString, walletType, generateTestWallet, signAndSendLaunchTransaction } =
    useWallet();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedCharityId, setSelectedCharityId] = useState(charities[0]?.id || '');
  const [donationPercent, setDonationPercent] = useState(30);
  const [isImmutable, setIsImmutable] = useState(true);
  const [initialBuySol, setInitialBuySol] = useState<number>(0);
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [launchedToken, setLaunchedToken] = useState<Launch | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const selectedCharity = useMemo(
    () => charities.find((c) => c.id === selectedCharityId) || charities[0],
    [charities, selectedCharityId]
  );

  const donationBps = donationPercent * 100;
  const creatorShareBps = 10000 - donationBps;

  if (!isOpen) return null;

  const resetAndClose = () => {
    onClose();
    setStep(1);
    setLaunchedToken(null);
    setErrorText('');
    setProgressText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('That file is not an image', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast('Image must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validateStepOne = () => {
    if (!name.trim() || !symbol.trim() || !description.trim()) {
      setErrorText('Name, ticker and description are required.');
      return false;
    }
    if (name.length > LIMITS.name || symbol.length > LIMITS.symbol || description.length > LIMITS.description) {
      setErrorText('Some fields are over their character limit.');
      return false;
    }
    setErrorText('');
    return true;
  };

  const handleLaunchSubmit = async () => {
    if (!selectedCharity) {
      setErrorText('No verified shelter is available to receive fees.');
      return;
    }
    if (!connected || !publicKeyString) {
      setErrorText('Connect a Solana wallet to sign the launch.');
      setWalletOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText('');
      setProgressText('Preparing fee-share parameters...');

      const prepRes = await fetch('/api/pump/prepare-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          charityId: selectedCharity.id,
          donationBps,
          creatorWallet: publicKeyString,
          isImmutable,
        }),
      });

      const prepData = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepData.error || 'Failed to prepare launch parameters');

      setProgressText('Building the mint and fee-share transaction...');
      const mintKeypair = await Keypair.generate();

      setProgressText('Waiting for your wallet signature...');
      const txResult = await signAndSendLaunchTransaction({
        mintKeypair,
        charityWallet: selectedCharity.wallet_address,
        donationBps,
        initialBuySol: Number(initialBuySol) || 0,
        tokenMeta: {
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          uri: `https://catpad.fun/metadata/${mintKeypair.publicKey.toBase58()}.json`,
        },
      });

      setProgressText('Verifying the transaction on Solana...');
      const confirmRes = await fetch('/api/pump/confirm-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: txResult.mint,
          txSignature: txResult.signature,
          creatorWallet: publicKeyString,
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          imageUrl: imageUrl || BRAND.assets.coin,
          metadataUri: `https://catpad.fun/metadata/${txResult.mint}.json`,
          charityId: selectedCharity.id,
          donationBps,
          isImmutable,
          twitter: twitter.trim(),
          telegram: telegram.trim(),
          website: website.trim(),
          isSimulation: true,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        throw new Error(confirmData.error || 'Failed to confirm the launch on-chain');
      }

      setLaunchedToken(confirmData.launch);
      onLaunchSuccess(confirmData.launch);
      toast(`${confirmData.launch.symbol} is live on the curve`, 'success');
    } catch (err: any) {
      console.error('Launch failure:', err);
      const message = err?.message || 'The transaction was rejected or failed on-chain';
      setErrorText(message);
      toast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewName = name.trim() || 'Your coin';
  const previewSymbol = (symbol.trim() || 'TICKER').toUpperCase();

  return (
    <>
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Launch a coin"
      >
        <div className="mx-auto my-6 w-full max-w-5xl rounded-xl border border-line bg-card">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                <Rocket className="h-3.5 w-3.5 text-accent" />
                Pump.fun launch
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                {launchedToken ? 'Your coin is live' : 'Launch a cat coin'}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              aria-label="Close launch form"
              className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {launchedToken ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
              <h3 className="mt-4 text-xl font-semibold text-white">
                {launchedToken.name} (${launchedToken.symbol}) is live
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                {formatPercent(launchedToken.donation_bps)} of creator fees now route to{' '}
                {selectedCharity?.name || 'the selected shelter'}.
              </p>

              <dl className="mx-auto mt-6 max-w-lg space-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-left font-mono text-[11px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Mint</dt>
                  <dd className="truncate text-white">{shortAddress(launchedToken.mint, 6)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Fee PDA</dt>
                  <dd className="truncate text-white">{launchedToken.config_pda}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Signature</dt>
                  <dd className="truncate text-white">{shortAddress(launchedToken.tx_signature, 6)}</dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={`https://pump.fun/coin/${launchedToken.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
                >
                  View on Pump.fun
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded-lg border border-line-strong px-5 py-2.5 text-sm text-white transition hover:bg-white/5"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* ------------------------------------------------------ FORM */}
              <div className="border-b border-line px-6 py-6 lg:border-b-0 lg:border-r">
                {/* Step tracker */}
                <ol className="mb-6 flex items-center gap-6">
                  {STEPS.map((s) => {
                    const active = step === s.id;
                    const done = step > s.id;
                    return (
                      <li key={s.id} className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                            active || done ? 'text-accent' : 'text-muted'
                          }`}
                        >
                          0{s.id}
                        </span>
                        <span className={`text-xs ${active ? 'text-white' : 'text-muted'}`}>{s.label}</span>
                        {done && <Check className="h-3 w-3 text-accent" />}
                      </li>
                    );
                  })}
                </ol>

                {errorText && (
                  <p className="mb-5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-white">
                    {errorText}
                  </p>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label htmlFor="coin-name" className="text-xs text-muted">
                            Name
                          </label>
                          <Counter value={name.length} max={LIMITS.name} />
                        </div>
                        <input
                          id="coin-name"
                          type="text"
                          value={name}
                          maxLength={LIMITS.name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Whisker Index"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label htmlFor="coin-symbol" className="text-xs text-muted">
                            Ticker
                          </label>
                          <Counter value={symbol.length} max={LIMITS.symbol} />
                        </div>
                        <input
                          id="coin-symbol"
                          type="text"
                          value={symbol}
                          maxLength={LIMITS.symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          placeholder="WHISK"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm uppercase text-white placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="coin-description" className="text-xs text-muted">
                          Description
                        </label>
                        <Counter value={description.length} max={LIMITS.description} />
                      </div>
                      <textarea
                        id="coin-description"
                        rows={4}
                        value={description}
                        maxLength={LIMITS.description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is the meme, and which cats does it help?"
                        className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>

                    {/* Upload box */}
                    <div>
                      <span className="mb-1.5 block text-xs text-muted">Coin image</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-4 rounded-lg border border-dashed border-line-strong px-4 py-4 text-left transition hover:border-accent"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Selected coin"
                            className="h-14 w-14 flex-shrink-0 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted">
                            <ImagePlus className="h-5 w-5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm text-white">
                            {imageUrl ? 'Replace image' : 'Upload an image'}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted">
                            Square PNG, JPG or WebP. Max 2MB.
                          </span>
                        </span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="url"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="X / Twitter URL"
                        aria-label="X profile URL"
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-white placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                      <input
                        type="url"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="Telegram URL"
                        aria-label="Telegram URL"
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-white placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="Website URL"
                        aria-label="Website URL"
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-white placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <span className="mb-2 block text-xs text-muted">Choose a verified shelter</span>
                      {charities.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-xs text-muted">
                          No shelters are available yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {charities.map((charity) => {
                            const selected = charity.id === selectedCharity?.id;
                            return (
                              <button
                                key={charity.id}
                                type="button"
                                onClick={() => setSelectedCharityId(charity.id)}
                                className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition ${
                                  selected
                                    ? 'border-accent bg-accent/5'
                                    : 'border-line bg-surface hover:border-line-strong'
                                }`}
                              >
                                <img src={charity.avatar_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5 text-sm text-white">
                                    {charity.name}
                                    <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
                                  </span>
                                  <span className="mt-0.5 block font-mono text-[10px] text-muted">
                                    {shortAddress(charity.wallet_address, 5)}
                                  </span>
                                </span>
                                {selected && <Check className="mt-1 h-4 w-4 flex-shrink-0 text-accent" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-line bg-surface px-4 py-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="block text-xs text-muted">Creator fee share to the shelter</span>
                          <span className="font-mono text-2xl text-white">{donationPercent}%</span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          {donationBps} bps
                        </span>
                      </div>

                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={donationPercent}
                        onChange={(e) => setDonationPercent(Number(e.target.value))}
                        aria-label="Charity fee share percentage"
                        className="mt-4 w-full accent-[#ff6a00]"
                      />

                      <div className="mt-3 flex gap-2">
                        {[10, 25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDonationPercent(pct)}
                            className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                              donationPercent === pct
                                ? 'border-accent text-accent'
                                : 'border-line text-muted hover:text-white'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex overflow-hidden rounded-full">
                        <span style={{ width: `${donationPercent}%` }} className="h-1.5 bg-accent" />
                        <span style={{ width: `${100 - donationPercent}%` }} className="h-1.5 bg-line-strong" />
                      </div>
                      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
                        <span className="text-accent">{donationBps} bps shelter</span>
                        <span>{creatorShareBps} bps creator</span>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={isImmutable}
                        onChange={(e) => setIsImmutable(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#ff6a00]"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <Lock className="h-3.5 w-3.5 text-accent" />
                          Lock the fee split permanently
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                          Revoking the PumpFees authority makes the split immutable. Nobody — including you
                          — can lower the shelter's share afterwards.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-line bg-surface px-4 py-4">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        Fee split
                      </span>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-white">{selectedCharity?.name || 'Shelter'}</span>
                        <span className="font-mono text-accent">{formatPercent(donationBps)}</span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-sm">
                        <span className="text-muted">You</span>
                        <span className="font-mono text-white">{formatPercent(creatorShareBps)}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-muted">
                        <Lock className="h-3 w-3 text-accent" />
                        {isImmutable ? 'Locked on-chain after launch' : 'Not locked — you can change it later'}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="initial-buy" className="mb-1.5 block text-xs text-muted">
                        Initial buy (optional)
                      </label>
                      <div className="relative">
                        <input
                          id="initial-buy"
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={initialBuySol || ''}
                          onChange={(e) => setInitialBuySol(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 pr-14 font-mono text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                          SOL
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted">
                        Buys tokens at the launch price in the same transaction.
                      </p>
                    </div>

                    {!connected ? (
                      <div className="rounded-lg border border-dashed border-line-strong px-4 py-4 text-xs text-muted">
                        <p className="text-white">A wallet is needed to sign this launch.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setWalletOpen(true)}
                            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-accent-hover"
                          >
                            Connect wallet
                          </button>
                          {DEVNET_WALLET_ENABLED && (
                            <button
                              type="button"
                              onClick={async () => {
                                await generateTestWallet();
                                toast('Devnet test wallet ready', 'success');
                              }}
                              className="rounded-md border border-line px-3 py-1.5 text-xs text-white transition hover:border-line-strong"
                            >
                              Use devnet test wallet
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-line px-3.5 py-3 text-xs">
                        <span className="text-muted">Signing with</span>
                        <span className="font-mono text-white">
                          {shortAddress(publicKeyString, 5)}
                          {walletType === 'generated' && (
                            <span className="ml-2 rounded border border-line px-1 py-0.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                              Devnet
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {isSubmitting && (
                      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
                        <Spinner />
                        <span className="font-mono text-[11px] text-muted">{progressText}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer nav */}
                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => (step === 1 ? resetAndClose() : setStep((step - 1) as 1 | 2))}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-white disabled:opacity-40"
                  >
                    {step === 1 ? (
                      'Cancel'
                    ) : (
                      <>
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </>
                    )}
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (step === 1 && !validateStepOne()) return;
                        setStep((step + 1) as 2 | 3);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLaunchSubmit}
                      disabled={isSubmitting || !connected || !selectedCharity}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSubmitting ? <Spinner className="h-4 w-4 border-black border-t-transparent" /> : <Rocket className="h-4 w-4" />}
                      {isSubmitting ? 'Launching' : 'Sign & launch'}
                    </button>
                  )}
                </div>
              </div>

              {/* --------------------------------------------------- PREVIEW */}
              <aside className="bg-black/30 px-6 py-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                    Live preview
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Card</span>
                </div>

                <div className="mt-4 rounded-xl border border-line bg-card p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={imageUrl || BRAND.assets.coin}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded-lg border border-line object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{previewName}</h3>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                        ${previewSymbol}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">
                    {description.trim() || 'Your description will appear here once you write it.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-2.5 py-2">
                    <span className="truncate text-[11px] text-muted">
                      {selectedCharity?.name || 'Verified shelter'}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1 font-mono text-[11px] text-accent">
                      {donationPercent}%
                      {isImmutable && <Lock className="h-3 w-3 text-muted" />}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      <span>Curve</span>
                      <span className="text-white">0.0%</span>
                    </div>
                    <div className="h-1 rounded-full bg-line" />
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                    <div>
                      <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Market cap
                      </span>
                      <span className="font-mono text-sm text-white">0.00 SOL</span>
                    </div>
                    <span className="rounded-md border border-line px-2 py-1 text-[11px] text-muted">
                      Trade
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-muted">
                  Non-custodial. Your wallet signs everything; CatPad never holds funds or keys.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>

      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
};
