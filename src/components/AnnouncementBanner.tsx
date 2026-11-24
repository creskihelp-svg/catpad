import React, { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { SiteBanner } from '../types.ts';

interface AnnouncementBannerProps {
  banner: SiteBanner;
}

const safeExternalUrl = (raw?: string): string | null => {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
};

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ banner }) => {
  const [copied, setCopied] = useState(false);

  if (!banner.enabled || !banner.text.trim()) return null;

  const ca = banner.ca_address?.trim();
  const caUrl = safeExternalUrl(banner.ca_url);

  const handleCopyCa = async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard optional */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b border-white/10 bg-[#161915] px-4 py-1.5 text-center text-xs text-[#F5F4EF]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
        <span className="inline-flex items-center gap-2 font-medium tracking-wide">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E7B83C] shadow-[0_0_8px_rgba(231,184,60,0.8)]"
            aria-hidden="true"
          />
          <span>{banner.text}</span>
        </span>

        {ca && (
          <button
            type="button"
            onClick={handleCopyCa}
            title="Copy contract address"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-[#E7B83C] transition hover:border-white/30 hover:bg-white/[0.12]"
          >
            <span className="max-w-[200px] truncate sm:max-w-xs">{ca}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3 opacity-80" aria-hidden="true" />
            )}
          </button>
        )}

        {caUrl && (
          <a
            href={caUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[#E7B83C]/40 bg-[#E7B83C]/15 px-2 py-0.5 text-[11px] font-medium text-[#E7B83C] transition hover:border-[#E7B83C]/70 hover:bg-[#E7B83C]/25"
          >
            <span>{ca ? 'View CA' : 'View link'}</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};
