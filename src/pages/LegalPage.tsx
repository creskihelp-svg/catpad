import React from 'react';
import { AlertTriangle, Lock, Shield } from 'lucide-react';
import { Reveal, SectionLabel } from '../components/ui/Primitives.tsx';
import { BRAND } from '../lib/brand.ts';

interface LegalPageProps {
  page: 'terms' | 'privacy' | 'risk';
}

const TERMS = [
  {
    title: '1. Non-custodial operation',
    body: 'CatPad is a front-end interface to the Solana blockchain, the Pump.fun bonding curve program and the PumpFees fee-sharing program. CatPad never stores private keys, seed phrases or user funds. Every transaction is built client-side and executed only with your wallet signature.',
  },
  {
    title: '2. Creator fee sharing',
    body: 'When a coin is launched with fee sharing enabled, the selected shelter receives a fixed share of creator trading fees through a Solana Program Derived Address. Once the configuration is locked, neither CatPad nor the creator can lower or redirect that share.',
  },
  {
    title: '3. Shelter verification',
    body: 'Shelters are reviewed for public non-profit status and for control of their Solana receiving wallet. CatPad does not operate or manage these independent organisations and cannot guarantee their future conduct.',
  },
  {
    title: '4. Prohibited content',
    body: 'Coins promoting violence, hate speech, animal cruelty or illegal activity are not permitted. CatPad may unlist any coin from its directory at any time.',
  },
  {
    title: '5. No financial advice',
    body: 'Nothing on CatPad is investment, legal or tax advice. You are solely responsible for the transactions you sign and for your own due diligence.',
  },
];

const RISKS = [
  {
    title: 'Total loss is possible',
    body: 'Memecoins are speculative. A token can lose all of its value within minutes, and liquidity can disappear entirely. Never spend money you cannot afford to lose.',
  },
  {
    title: 'Bonding curves are volatile',
    body: 'Prices on a Pump.fun bonding curve are driven purely by supply, demand and trading activity. CatPad does not control price, liquidity or trading volume.',
  },
  {
    title: 'Smart contract risk',
    body: 'Trading interacts with third-party on-chain programs. Bugs, exploits or unexpected program upgrades could affect your funds and are outside CatPad\'s control.',
  },
  {
    title: 'Charity shares are not donations',
    body: 'A fee share redirects part of a creator\'s trading fees. It is not a tax-deductible donation, an escrow, or a guarantee that a shelter receives any particular amount.',
  },
  {
    title: 'Self-custody responsibility',
    body: 'You alone control your wallet. Lost keys, phishing sites and malicious transaction approvals cannot be reversed on-chain.',
  },
];

export const LegalPage: React.FC<LegalPageProps> = ({ page }) => {
  const meta = {
    terms: {
      label: 'Legal / Terms',
      title: 'Terms of Service',
      icon: <Shield className="h-4 w-4 text-accent" />,
      intro:
        'These terms describe how the CatPad interface works. By using it you accept them in full.',
      sections: TERMS,
    },
    privacy: {
      label: 'Legal / Privacy',
      title: 'Privacy Policy',
      icon: <Lock className="h-4 w-4 text-accent" />,
      intro: 'CatPad collects as little as possible, because the chain already holds the rest.',
      sections: [
        {
          title: '1. What we do not collect',
          body: 'No names, home addresses, government IDs, phone numbers or private keys. No third-party behavioural trackers. We do not sell data.',
        },
        {
          title: '2. Public blockchain data',
          body: 'Wallet addresses, transaction signatures, mints and token metadata are public and permanent by design. Anything you sign is visible to anyone.',
        },
        {
          title: '3. Local storage',
          body: 'Your browser may store a local session token for the admin area and your sound preference. This stays on your device and is never sent to ad networks.',
        },
        {
          title: '4. Third-party services',
          body: 'RPC providers and token metadata hosts process the requests needed to load this app. Their own policies apply to that processing.',
        },
      ],
    },
    risk: {
      label: 'Legal / Risk',
      title: 'Risk Disclosure',
      icon: <AlertTriangle className="h-4 w-4 text-accent" />,
      intro: 'Read this before you launch, trade or donate. Memecoins are high risk.',
      sections: RISKS,
    },
  }[page];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 lg:px-8">
      <Reveal>
        <div className="flex items-center gap-2">
          {meta.icon}
          <SectionLabel>{meta.label}</SectionLabel>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl">{meta.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{meta.intro}</p>
      </Reveal>

      <div className="mt-8 rounded-lg border border-line bg-card px-4 py-3 text-xs leading-relaxed text-white">
        <strong className="font-semibold">Risk warning.</strong> {BRAND.disclaimer} Tokens launched
        through CatPad are speculative digital assets on Solana and may lose 100% of their value.
      </div>

      <div className="mt-10 space-y-8">
        {meta.sections.map((section) => (
          <Reveal key={section.title}>
            <h2 className="text-base font-semibold text-white">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
};
