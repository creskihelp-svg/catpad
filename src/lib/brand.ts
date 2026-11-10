/**
 * Single source of truth for CatPad brand copy, assets and feature flags.
 * Asset files live in `public/brand` — replace the placeholders there with the
 * real exports (same filenames) and everything picks them up.
 */

const env = import.meta.env;

export const X_HANDLE = (env.VITE_X_HANDLE as string | undefined)?.trim() || 'catpadfun';

export const BRAND = {
  name: 'CatPad',
  tagline: 'Memecoins for cat rescues',
  xHandle: X_HANDLE,
  xUrl: `https://x.com/${X_HANDLE.replace(/^@/, '')}`,
  disclaimer: 'Memecoins are high risk. Not financial advice. 18+.',
  ogImage: '/og.png',
  assets: {
    logo: '/brand/logo.svg',
    coin: '/brand/coin.png',
    heroVideo: '/brand/hero.mp4',
    heroPoster: '/brand/hero-poster.png',
  },
};

/**
 * Devnet test wallets are a development convenience only.
 * Enable explicitly with VITE_ENABLE_DEVNET_WALLET="true" outside of dev builds.
 */
export const DEVNET_WALLET_ENABLED =
  env.VITE_ENABLE_DEVNET_WALLET === 'true' || Boolean(env.DEV);

/** Wallets allowed to see the admin entry point in the navigation. */
export const ADMIN_WALLETS = ((env.VITE_ADMIN_WALLETS as string | undefined) || '')
  .split(',')
  .map((w) => w.trim())
  .filter(Boolean);
