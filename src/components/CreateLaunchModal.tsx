import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext.tsx';
import { Charity, Launch } from '../types.ts';
import { Keypair } from '@solana/web3.js';
import { 
  X, 
  Rocket, 
  Heart, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  ChevronRight,
  Info
} from 'lucide-react';

interface CreateLaunchModalProps {
  charities: Charity[];
  isOpen: boolean;
  onClose: () => void;
  onLaunchSuccess: (newLaunch: Launch) => void;
}

const PRESET_CAT_AVATARS = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=600&h=600&fit=crop',
];

export const CreateLaunchModal: React.FC<CreateLaunchModalProps> = ({
  charities,
  isOpen,
  onClose,
  onLaunchSuccess,
}) => {
  const {
    connected,
    publicKeyString,
    connectBrowserWallet,
    generateTestWallet,
    signAndSendLaunchTransaction,
  } = useWallet();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_CAT_AVATARS[0]);
  const [selectedCharityId, setSelectedCharityId] = useState(charities[0]?.id || '');
  const [donationPercent, setDonationPercent] = useState<number>(30); // 30% default
  const [isImmutable, setIsImmutable] = useState<boolean>(true);
  const [initialBuySol, setInitialBuySol] = useState<number>(0);
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');

  // Status & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [launchedToken, setLaunchedToken] = useState<Launch | null>(null);

  if (!isOpen) return null;

  const selectedCharity = charities.find((c) => c.id === selectedCharityId) || charities[0];
  const donationBps = donationPercent * 100;
  const creatorShareBps = 10000 - donationBps;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunchSubmit = async () => {
    if (!connected || !publicKeyString) {
      setErrorText('Please connect a Solana wallet first');
      return;
    }

    if (!name.trim() || !symbol.trim() || !description.trim()) {
      setErrorText('Please provide name, symbol, and description');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText('');
      setCurrentProgressText('Preparing Pump.fun & PumpFees parameters...');

      // 1. Prepare launch with backend parameters
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
      if (!prepRes.ok) {
        throw new Error(prepData.error || 'Failed to prepare launch parameters');
      }

      // 2. Generate local token mint keypair client-side
      setCurrentProgressText('Generating token Mint keypair & bundling transaction...');
      const mintKeypair = await (Keypair as any).generate();

      // 3. Request user's wallet to sign transaction bundling create + fee share config
      setCurrentProgressText('Awaiting wallet approval & on-chain signature...');
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

      // 4. Server-side on-chain verification
      setCurrentProgressText('Verifying transaction on Solana RPC & recording launch...');
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
          imageUrl,
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
        throw new Error(confirmData.error || 'Failed to confirm launch on-chain');
      }

      setLaunchedToken(confirmData.launch);
      onLaunchSuccess(confirmData.launch);
      setStep(4);
    } catch (err: any) {
      console.error('Launch failure:', err);
      setErrorText(err.message || 'Transaction was rejected or failed on-chain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111624] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Step Tracker */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Rocket className="w-3.5 h-3.5" />
            <span>Pump.fun Token Launchpad</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {step === 4 ? '🎉 Coin Launched Successfully!' : 'Launch a Cat Memecoin'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 4
              ? 'Your token is live on Pump.fun with immutable creator fees funding feline welfare.'
              : 'Configure your coin and lock automated creator fee sharing to a verified feline rescue.'}
          </p>

          {step < 4 && (
            <div className="flex items-center space-x-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'bg-amber-400'
                      : s < step
                      ? 'bg-emerald-400'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {errorText && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* STEP 1: TOKEN PROFILE */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Token Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purr Protocol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ticker Symbol <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PURR"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-sm font-mono text-white placeholder-slate-500 outline-none transition uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Description & Mission <span className="text-amber-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain the cat meme and your pledge to help street cats..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-sm text-white placeholder-slate-500 outline-none transition resize-none"
              />
            </div>

            {/* Avatar Selection & Preview */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Cat Image (Avatar)
              </label>
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border-2 border-amber-400/40 flex-shrink-0">
                  <img src={imageUrl} alt="Token preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Custom Image</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-[11px] text-slate-400 block mt-1">Or choose a preset cat avatar below:</span>
                </div>
              </div>

              {/* Preset Avatars */}
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {PRESET_CAT_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageUrl(url)}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                      imageUrl === url ? 'border-amber-400 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Social Links (Optional) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <input
                type="text"
                placeholder="Twitter (https://x.com/...)"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none"
              />
              <input
                type="text"
                placeholder="Telegram (https://t.me/...)"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none"
              />
              <input
                type="text"
                placeholder="Website (https://...)"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!name.trim() || !symbol.trim() || !description.trim()) {
                    setErrorText('Please fill in token name, symbol, and description.');
                    return;
                  }
                  setErrorText('');
                  setStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center space-x-1.5 transition cursor-pointer"
              >
                <span>Next: Choose Charity</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFIED CHARITY & IMMUTABLE FEE SHARING */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select Verified Feline Rescue
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {charities.map((charity) => {
                  const isSelected = charity.id === selectedCharityId;
                  return (
                    <div
                      key={charity.id}
                      onClick={() => setSelectedCharityId(charity.id)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <img
                          src={charity.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate flex items-center space-x-1">
                            <span>{charity.name}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {charity.wallet_address.slice(0, 4)}...{charity.wallet_address.slice(-4)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {charity.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Donation Share Slider & Basis Points */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                    <span>Creator Trading Fee Share</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Allocated directly to {selectedCharity.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black font-mono text-amber-400">
                    {donationPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    ({donationBps} BPS)
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={donationPercent}
                onChange={(e) => setDonationPercent(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Quick Presets */}
              <div className="flex justify-between items-center pt-1">
                {[10, 25, 30, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDonationPercent(pct)}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition ${
                      donationPercent === pct
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Creator vs Charity Breakdown */}
              <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
                <span>Charity receives: <strong className="text-pink-400">{donationBps} BPS ({donationPercent}%)</strong></span>
                <span>Creator receives: <strong className="text-slate-200">{creatorShareBps} BPS ({100 - donationPercent}%)</strong></span>
              </div>
            </div>

            {/* Immutability Lock Toggle */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start space-x-3">
              <input
                type="checkbox"
                id="immutableCheck"
                checked={isImmutable}
                onChange={(e) => setIsImmutable(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <label htmlFor="immutableCheck" className="text-xs text-slate-200 cursor-pointer">
                <span className="font-bold text-emerald-300 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Fee Sharing Configuration (Make Immutable)</span>
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                  Permanently revokes authority on the PumpFees Program Derived Address (PDA) so you or anyone else cannot reduce or revoke the charity’s donation split post-launch.
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center space-x-1.5 transition cursor-pointer"
              >
                <span>Next: Review & Launch</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: INITIAL DEV BUY & FINAL ONE-CLICK LAUNCH */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Launch Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <img src={imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <h3 className="text-base font-black text-white">{name} (${symbol})</h3>
                  <span className="text-xs text-slate-400 line-clamp-1">{description}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div className="p-2 rounded-lg bg-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">BENEFICIARY</span>
                  <span className="font-bold text-pink-300">{selectedCharity.name}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">FEE SPLIT</span>
                  <span className="font-bold font-mono text-amber-400">{donationPercent}% ({donationBps} BPS)</span>
                </div>
              </div>
            </div>

            {/* Optional Dev Initial Buy */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Initial Dev Buy (Optional SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="0.0 SOL (no initial buy)"
                  value={initialBuySol || ''}
                  onChange={(e) => setInitialBuySol(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3.5 pr-14 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 outline-none"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">SOL</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Optional: Purchase tokens at bonding curve launch price in the same atomic block.
              </span>
            </div>

            {/* Wallet connection check */}
            {!connected && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3">
                <p>You must connect a Solana wallet to sign the launch transaction.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={connectBrowserWallet}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Connect Extension
                  </button>
                  <button
                    type="button"
                    onClick={generateTestWallet}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                  >
                    Use Instant Devnet Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Submission Progress State */}
            {isSubmitting && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center space-x-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-xs font-mono text-amber-300">{currentProgressText}</span>
              </div>
            )}

            <div className="pt-2 flex justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={isSubmitting || !connected}
                onClick={handleLaunchSubmit}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-slate-950" />
                <span>Sign & Launch on Pump.fun</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS! */}
        {step === 4 && launchedToken && (
          <div className="space-y-6 text-center animate-fadeIn py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                {launchedToken.name} (${launchedToken.symbol}) is LIVE!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                The bonding curve is open on Pump.fun. {donationPercent}% of all creator trading fees are irrevocably directed to {selectedCharity.name}.
              </p>
            </div>

            {/* Mint & Signature Badges */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs font-mono space-y-2 max-w-lg mx-auto">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mint Address:</span>
                <span className="text-amber-400">{launchedToken.mint}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fee PDA:</span>
                <span className="text-emerald-400">{launchedToken.config_pda}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tx Signature:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{launchedToken.tx_signature}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://pump.fun/coin/${launchedToken.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition"
              >
                <span>View on Pump.fun</span>
                <ExternalLink className="w-4 h-4 text-slate-950" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
