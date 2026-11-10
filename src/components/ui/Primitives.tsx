import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { classNames } from '../../lib/format.ts';

/** Small mono label that sits above every headline. */
export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={classNames(
      'inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-muted',
      className
    )}
  >
    {children}
  </span>
);

/** Fades content up once it enters the viewport. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}> = ({ children, className, delay = 0, as = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as any;

  return (
    <Tag
      ref={ref as any}
      style={{ transitionDelay: `${delay}ms` }}
      className={classNames('reveal', visible && 'is-visible', className)}
    >
      {children}
    </Tag>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={classNames('skeleton rounded-md', className)} aria-hidden="true" />
);

export const TokenCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-line bg-card p-4">
    <div className="mb-4 flex items-center gap-3">
      <Skeleton className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="mb-3 h-3 w-full" />
    <Skeleton className="mb-4 h-3 w-4/5" />
    <Skeleton className="h-1.5 w-full" />
    <div className="mt-4 flex justify-between">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const CharityCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-line bg-card p-6">
    <div className="flex items-start gap-4">
      <Skeleton className="h-14 w-14" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="mt-5 h-3 w-full" />
    <Skeleton className="mt-2 h-3 w-5/6" />
    <Skeleton className="mt-6 h-10 w-full" />
  </div>
);

/** Dashed border card: icon, one line of copy, one action. */
export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, copy, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
    <div className="mb-4 text-muted">{icon}</div>
    <h3 className="text-base font-semibold text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-muted">{copy}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-hover"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    )}
  </div>
);

export const SoonBadge: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={classNames(
      'rounded border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted',
      className
    )}
  >
    Soon
  </span>
);

/** "Live on Solana" indicator with a pulsing dot. */
export const StatusChip: React.FC<{ online: boolean; network: string }> = ({ online, network }) => {
  const label = network === 'mainnet-beta' ? 'Live on Solana' : `Live on ${network}`;
  return (
    <span className="hidden items-center gap-2 rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:inline-flex">
      <span
        className={classNames(
          'h-1.5 w-1.5 rounded-full',
          online ? 'status-dot bg-accent' : 'bg-line-strong'
        )}
      />
      {online ? label : 'RPC offline'}
    </span>
  );
};

export const Spinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <span
    className={classNames(
      'inline-block animate-spin rounded-full border-2 border-accent border-t-transparent',
      className
    )}
    aria-hidden="true"
  />
);

