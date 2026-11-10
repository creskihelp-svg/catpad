import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BRAND } from '../lib/brand.ts';
import { Tab } from '../types.ts';

interface FooterProps {
  setCurrentTab: (tab: Tab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-5 py-7 text-xs text-muted sm:flex-row sm:items-center lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-mono uppercase tracking-[0.16em]">© 2026 {BRAND.name}</span>
          <button type="button" onClick={() => setCurrentTab('terms')} className="transition hover:text-white">
            Terms
          </button>
          <button type="button" onClick={() => setCurrentTab('risk')} className="transition hover:text-white">
            Risk
          </button>
          <a
            href={BRAND.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-white"
          >
            @{BRAND.xHandle.replace(/^@/, '')}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        <p className="text-muted">{BRAND.disclaimer}</p>
      </div>
    </footer>
  );
};
