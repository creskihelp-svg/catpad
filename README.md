# CatPad

Memecoins that fund cat rescues. Launch a coin on Solana, lock a share of the creator fees to a
verified shelter wallet, and let anyone check the receipts.

## Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4
- **API:** one Cloudflare Worker (`worker/index.ts`) serving `/api/*` plus the built SPA
- **Local dev:** `server.ts` is a thin Express adapter around that same worker handler, so local
  and deployed behaviour cannot drift
- **Database:** Cloudflare D1 (SQLite) binding `DB`
- **Chain:** Solana JSON-RPC, used to verify every launch and donation before it is recorded

## Run locally

```bash
bun install
cp .env.example .env      # fill in ADMIN_USERNAME & ADMIN_SECRET_KEY (.env is gitignored)
bun run dev               # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with Vite middleware and the shared API handler |
| `bun run build` | Build the SPA into `dist/` |
| `bun run build:worker` | Bundle the worker into `worker-dist/index.mjs` |
| `bun run lint` | `tsc --noEmit` |
| `bun run test` | Vitest: session tokens, address validation, transaction parsing |

## Data

Everything persisted lives in D1 and is created on first use:

| Table | Holds |
| --- | --- |
| `charities` | Shelter name, EIN, website, Solana receiving wallet, total donations |
| `launches` | One row per coin: mint, creator, shelter, fee share, launch transaction, featured/hidden flags |
| `donations` | Verified transfers, unique per transaction signature |
| `admin_actions` | Who changed what: shelter create/update/delete, featured, unlist |
| `login_attempts` / `write_attempts` | Abuse throttles, shared across worker isolates |

Without a `DB` binding (for example a bare `wrangler dev`) the worker keeps the same shapes in
memory for the life of the process, so nothing breaks — it just does not survive a restart.

## On-chain verification

`worker/solana.ts` is shared by the worker and the dev server. A launch or donation is only accepted
when the signature is read back from the RPC node and:

- the transaction exists, succeeded, and was mined within the last hour;
- for a launch, the creator wallet signed it, the mint appears in its account keys, and the shelter
  wallet received lamports;
- for a donation, the shelter wallet's balance grew by at least the recorded amount.

Anything else is rejected with a specific reason and logged to the admin failure audit. The client
never reports a launch as successful unless the server accepted a verified signature.

Market cap and bonding-curve figures are `null` until a market data feed supplies them; the UI shows
`—` rather than an invented number.

## Admin

- Navigate directly to `/admin` in the browser address bar (not linked from the public footer).
- Configure `ADMIN_USERNAME` and `ADMIN_SECRET_KEY` in `.env` (for local / Node runs from GitHub) or in your deployment platform's Environment Variables / Secrets. Never commit `.env` to GitHub.
- The password is exchanged for an HMAC-SHA256 token (`v1.<expiry>.<signature>`, 8 hours). The
  password itself is never a bearer token, and both credentials are compared in constant time.
- 8 failed sign-ins per IP per 10 minutes, counted in D1.
- Admin requests verify the signed token server-side; mutations are same-origin only.
- Coins can be featured or hidden from the public directory, and the top banner & CA link can be updated live; every action is written to the admin log.

## Transparency and moderation

- `/coin/<mint>` is a real page with its own title, description, image and canonical URL, served by
  the worker with per-coin social tags.
- `/transparency` lists every shelter wallet, coin launch transaction and donation, each linked to
  Solscan.
- Hidden coins disappear from `/coins`, `/api/launches` and their `/coin/<mint>` page; admins still
  see them in the dashboard.

## Deployment

The site deploys to Freebuff Sites with `sites.manifest.json` (worker bundle plus `dist/`). The
deployment needs:

- a D1 binding named `DB` (created per environment),
- `ADMIN_SECRET_KEY` and `ADMIN_USERNAME` secrets,
- optionally `SENTRY_DSN` for error reporting and `SOLANA_RPC_URL` / `SOLANA_NETWORK` to point at
  mainnet instead of devnet.

```bash
bun run lint && bun run test && bun run build && bun run build:worker
```

## Notes

- Wallet connection uses the injected Phantom, Solflare or Backpack providers (`src/lib/wallets.tsx`).
  The optional devnet test wallet exists only behind `VITE_ENABLE_DEVNET_WALLET` and its key is kept
  in memory, never in `localStorage`.
- Memecoins are high risk. Not financial advice. 18+.
