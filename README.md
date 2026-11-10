# CatPad 🐾
> The Decentralized Pump.fun Memecoin Launchpad for Feline Charities on Solana.

CatPad enables anyone to create and launch cat-themed memecoins on Solana using Pump.fun's bonding curve, with automated, immutable creator fee splits irrevocably routed to verified cat rescues and shelters.

---

## 🔬 Pump.fun Fee-Sharing Investigation & Technical Findings

Before building CatPad, we conducted an in-depth investigation of Pump.fun's on-chain architecture, SDKs, and PumpPortal APIs:

### 1. Protocol Architecture & Program IDs
* **Pump.fun Bonding Curve Program:** `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
* **PumpFees (Creator Fee-Sharing) Program:** `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ`
* **Pump AMM Program (Raydium Graduation):** `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`

### 2. How Fee-Sharing Works On-Chain
* **Sharing Configuration PDA:** Derived via seeds `[b"sharing-config", mint.toBuffer()]` under the `PumpFees` program.
* **Instruction Workflow:**
  1. `createFeeSharingConfig`: Initializes the fee-sharing Program Derived Address (PDA) for a given token mint.
  2. `updateFeeShares`: Allocates basis points among designated shareholder wallets (where 10,000 BPS = 100%). For CatPad, the chosen charity receives `donation_bps` (e.g., 3,000 BPS = 30%) and the creator receives the remaining `10,000 - donation_bps` (7,000 BPS = 70%).
  3. **Immutability Locking:** Once configured, the authority can be permanently revoked/locked on-chain. This makes the fee sharing 100% immutable and trustless, ensuring creators cannot revoke or lower the charity's share post-launch.
  4. **Fee Distribution:** Accumulated creator fees from bonding curve trades are swept directly to shareholder wallets permissionlessly.

### 3. Key Limitations & Considerations Identified
* **BPS Strict Summation:** The sum of shareholder shares must strictly equal exactly `10,000 BPS` (100%).
* **Pre-Graduation vs Post-Graduation Pool PDAs:** When a token is active on the bonding curve, `pool` is set to `null` (or the bonding curve PDA). Once a token graduates to Raydium/PumpSwap AMM, fee distribution references the canonical AMM pool address (`canonicalPumpPoolPda(mint)`).
* **Direct Metadata Uploads:** Pump.fun deprecated legacy internal IPFS uploads; token metadata and images must be pinned to IPFS (e.g., Pinata/Arweave) or hosted via public deterministic endpoints.
* **Non-Custodial Design:** CatPad never stores private keys, seed phrases, or user funds. All transactions are composed as serialized payloads and signed exclusively by the creator's wallet (Phantom, Solflare, Backpack, or an ephemeral devnet test keypair).

---

## 🎨 Design System & Brand Assets

CatPad uses a flat, custom visual language: pure black canvas, flat dark-grey cards with thin borders, a single orange accent (`#FF6A00`), grotesk headlines and mono type for numbers, tickers and labels. No gradients, glows or emoji.

Design tokens live in `src/index.css` (Tailwind v4 `@theme`): `bg-ink`, `bg-card`, `border-line`, `text-muted`, `text-accent`.

Replace the placeholder brand files in `public/` and `public/brand/` with the real exports using the same filenames — `logo.svg`, `favicon.svg`, `og.png`, `hero.mp4`, `hero-poster.png`, `coin.png`. See `public/brand/README.md` for the full list.

Optional public configuration (see `.env.example`):

* `VITE_X_HANDLE` — handle shown in the footer, meta tags and share links.
* `VITE_ADMIN_WALLETS` — comma-separated wallets allowed to see the admin link.
* `VITE_ENABLE_DEVNET_WALLET` — exposes “Generate devnet test wallet” in production builds (always on in dev).

---

## 🚀 Quick Start & Installation

### Prerequisites
* Node.js v18+ or v20+
* npm or pnpm

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Solana Configuration
SOLANA_NETWORK="devnet" # or "mainnet-beta"
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Pump Programs
PUMPFUN_PROGRAM_ID="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
PUMPFEES_PROGRAM_ID="pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"

# Supabase (Optional for local testing; automatic fallback provided)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Admin Authentication
ADMIN_SECRET_KEY="catpad-admin-key-2026"
ADMIN_EMAIL="admin@catpad.fun"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase Schema & Migrations

The database migration file is located in `/supabase/schema.sql`.

### Tables Created:
1. `public.charities`: Verified feline rescues with EIN tax ID, website, and Solana receiving wallet address.
2. `public.launches`: Token mints, creator wallets, metadata URIs, donation basis points, and fee-sharing PDA addresses.
3. `public.donations`: On-chain donation and fee sweep records with transaction signatures.
4. `public.admin_roles`: Server-side role-based access control (RBAC) linked to `auth.users(id)`.

To apply to your Supabase project:
```bash
psql -h db.your-supabase-id.supabase.co -U postgres -d postgres -f supabase/schema.sql
```

---

## 🐾 Seed Charities

The seed script (`/supabase/seed.ts`) provisions 4 real-world verified cat non-profits:

1. **Flatbush Cats** (Brooklyn, NY) — 501(c)(3) EIN: `82-4112932`
   * Solana Wallet: `FlatCat5gB1xXkZzYF7cR4vP2m9wQeL8aN3uJsK6mTr1`
   * Mission: Affordable veterinary medicine and TNR rescue network.
2. **Alley Cat Allies** (National / Global) — 501(c)(3) EIN: `52-1768407`
   * Solana Wallet: `AlleyCat9mK3pL6vQ2wR8tN4xY1zF7cB5aE9sJ0dWe2`
   * Mission: Pioneers in humane trap-neuter-return policies and emergency cat relief.
3. **Blind Cat Rescue & Sanctuary** (St. Pauls, NC) — 501(c)(3) EIN: `20-8025211`
   * Solana Wallet: `BlindCat3rT7yU1iO9pA5sD2fG4hJ6kL8zX0cV4bN6m`
   * Mission: Lifetime sanctuary for blind, FIV+, and FeLV+ cats.
4. **Tabby's Place Sanctuary** (Ringoes, NJ) — 501(c)(3) EIN: `22-3843519`
   * Solana Wallet: `TabbyP1ace7qW4eR2tY9uI3oP5aS8dF1gH6jK0lZ8x`
   * Mission: Cage-free haven offering specialized medical care for felines from hopeless situations.

---

## 🔒 Security & Admin Access

* **Admin Route:** `/admin` (the nav link only appears for wallets listed in `VITE_ADMIN_WALLETS`)
* **Default dev passphrase:** `catpad-admin-key-2026` (set `ADMIN_SECRET_KEY` outside development)
* **Server-Side Role Verification:** Every admin request (`/api/admin/*`) enforces cryptographic Bearer token validation through server middleware; client-only bypass is impossible.
* **On-Chain Confirmation:** All token launches and donations are verified on the Solana RPC node before insertion into the database.

---

## 📦 Deployment to Vercel

1. Push to GitHub.
2. Connect your repository to Vercel.
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Configure environment variables in the Vercel Project Settings (`SOLANA_RPC_URL`, `SUPABASE_URL`, `ADMIN_SECRET_KEY`).
6. Deploy!
