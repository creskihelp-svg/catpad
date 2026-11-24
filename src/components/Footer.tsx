import React from 'react';
import { ArrowUpRight, Heart } from 'lucide-react';
import { BRAND } from '../lib/brand.ts';
import { Tab } from '../types.ts';
import { CatMark } from './Cat.tsx';

interface FooterProps {
  setCurrentTab: (tab: Tab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer className="mt-16 w-full">
      {/* Crisp black grass blade silhouette transition matching reference */}
      <div className="w-full overflow-hidden leading-none text-[#0B0B0D]" aria-hidden="true">
        <svg
          viewBox="0 0 1440 56"
          preserveAspectRatio="none"
          className="block h-10 w-full sm:h-12"
          fill="currentColor"
        >
          <path d="M0 56V38L12 18L22 40L34 12L46 39L60 22L72 41L88 8L102 38L116 24L128 42L144 14L158 40L174 19L188 43L204 10L218 39L234 25L248 41L264 15L278 38L296 20L310 42L326 11L342 39L358 23L374 41L392 14L408 40L424 18L440 43L456 9L472 39L490 21L506 42L524 16L540 40L556 22L572 43L590 12L606 38L624 20L640 41L658 14L674 39L690 24L706 42L724 10L740 40L758 18L774 41L792 13L808 39L824 23L840 42L858 11L874 38L892 19L908 42L926 14L942 40L958 21L974 43L992 9L1008 39L1026 22L1042 41L1060 15L1076 38L1092 20L1108 42L1126 12L1142 39L1160 23L1176 41L1194 13L1210 40L1226 18L1242 43L1260 10L1276 39L1294 21L1310 42L1328 15L1344 38L1360 20L1376 42L1394 12L1410 39L1426 22L1440 40V56H0Z" />
        </svg>
      </div>

      {/* Deep obsidian footer body */}
      <div className="relative overflow-hidden bg-[#0B0B0D] text-white">
        {/* Subtle decorative paw prints in background */}
        <svg
          viewBox="0 0 120 120"
          className="pointer-events-none absolute bottom-4 left-1/4 h-16 w-16 -rotate-12 text-white/[0.04]"
          fill="currentColor"
          aria-hidden="true"
        >
          <ellipse cx="60" cy="76" rx="24" ry="20" />
          <ellipse cx="32" cy="46" rx="9" ry="12" transform="rotate(-18 32 46)" />
          <ellipse cx="52" cy="34" rx="9" ry="12" transform="rotate(-5 52 34)" />
          <ellipse cx="73" cy="35" rx="9" ry="12" transform="rotate(8 73 35)" />
          <ellipse cx="90" cy="50" rx="8" ry="11" transform="rotate(24 90 50)" />
        </svg>

        <div className="relative mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            {/* Brand */}
            <button
              type="button"
              onClick={() => setCurrentTab('explore')}
              className="flex items-center gap-3 text-left"
            >
              <CatMark className="h-9 w-9" idle={false} />
              <span className="font-grotesk text-xl font-bold tracking-[-0.03em] text-white">
                {BRAND.name}
              </span>
            </button>

            {/* Navigation */}
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-white/75"
            >
              <button
                type="button"
                onClick={() => setCurrentTab('transparency')}
                className="transition hover:text-white"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('charities')}
                className="transition hover:text-white"
              >
                Shelters
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('transparency')}
                className="transition hover:text-white"
              >
                Receipts
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('terms')}
                className="transition hover:text-white"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('risk')}
                className="transition hover:text-white"
              >
                Risk
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('admin')}
                className="transition hover:text-white"
              >
                Admin
              </button>
            </nav>

            {/* Social (X) + Built for cats */}
            <div className="flex items-center gap-4 text-xs text-white/75">
              <div className="flex items-center gap-2.5">
                <a
                  href={BRAND.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="CatPad on X"
                  title="X"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                <a
                  href={BRAND.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-0.5 inline-flex items-center gap-1 transition hover:text-white"
                >
                  @{BRAND.xHandle.replace(/^@/, '')}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <span className="h-4 w-px bg-white/15" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 text-white/85">
                Built for cats.
                <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-[11px] text-white/45 sm:flex-row sm:items-center">
            <span>© 2026 {BRAND.name}. Non-custodial Solana protocol.</span>
            <span>{BRAND.disclaimer}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
