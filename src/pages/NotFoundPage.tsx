import React from 'react';
import { ArrowLeft, PawPrint } from 'lucide-react';
import { SectionLabel } from '../components/ui/Primitives.tsx';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => (
  <div className="mx-auto flex min-h-[62svh] w-full max-w-3xl flex-col justify-center px-5 py-20 lg:px-8">
    <SectionLabel>404 / Off the curve</SectionLabel>
    <h1 className="mt-4 text-[clamp(3rem,12vw,7rem)] font-bold leading-[0.9] tracking-[-0.05em] text-white">
      This page
      <br />
      went <span className="text-accent">feral.</span>
    </h1>
    <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
      The link you followed does not exist. The cats hid it somewhere in the litter box.
    </p>

    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to the launchpad
      </button>
      <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-5 py-2.5 text-sm text-muted">
        <PawPrint className="h-4 w-4" />
        Nothing here but paw prints
      </span>
    </div>
  </div>
);
