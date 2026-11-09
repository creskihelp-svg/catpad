import React from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface LegalPageProps {
  page: 'terms' | 'privacy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ page }) => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 text-left space-y-8 animate-fadeIn">
      {page === 'terms' ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Terms of Service</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Last updated: November 2026</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Risk Warning:</strong> Memecoins created via Pump.fun and CatPad are speculative digital assets on the Solana blockchain. Tokens may lose 100% of their monetary value. CatPad is not an investment fund, broker, or financial advisor.
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-lg font-bold text-white">1. Protocol Operation & Non-Custodial Nature</h3>
            <p>
              CatPad provides a front-end interface connecting users with the Solana blockchain, the Pump.fun bonding curve program, and the PumpFees fee-sharing program. CatPad never stores private keys, seed phrases, or user funds. All transactions are constructed client-side and executed exclusively via user-approved wallet signatures.
            </p>

            <h3 className="text-lg font-bold text-white">2. Creator Fee-Sharing & Autonomous PDAs</h3>
            <p>
              When a creator launches a coin with fee sharing enabled, the designated charity receives creator trading fees distributed through autonomous Solana Program Derived Addresses (PDAs). Once locked or marked immutable, this configuration cannot be altered, paused, or redirected by CatPad or the token creator.
            </p>

            <h3 className="text-lg font-bold text-white">3. Charity Verification</h3>
            <p>
              Charities listed on CatPad are reviewed for public tax-exempt status (such as 501(c)(3) in the United States) and cryptographic control of their Solana receiving addresses. CatPad does not operate or manage these independent rescues.
            </p>

            <h3 className="text-lg font-bold text-white">4. Prohibited Content</h3>
            <p>
              Tokens promoting violence, hate speech, animal cruelty, or illegal activities are strictly forbidden. CatPad reserves the right to unlist malicious tokens from its front-end directory.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Last updated: November 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-lg font-bold text-white">1. Information We Do Not Collect</h3>
            <p>
              CatPad does not collect personal names, home addresses, government IDs, phone numbers, or private cryptographic keys. We do not use third-party behavioral trackers or sell user data.
            </p>

            <h3 className="text-lg font-bold text-white">2. Public Blockchain Data</h3>
            <p>
              Solana wallet addresses, transaction signatures, token mints, and token metadata uploaded to public decentralized storage (IPFS/Arweave) are inherently public and recorded permanently on the distributed ledger.
            </p>

            <h3 className="text-lg font-bold text-white">3. Local Storage</h3>
            <p>
              Your browser may store temporary local items such as an active devnet session or user theme preferences. This data remains on your device and is not transmitted to external advertising networks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
