# Solcierge

A crypto-native luxury concierge. Members brief a desk on jets, yachts, villas,
cars, tables or access, an operator quotes in USD, and the member settles in SOL or USDC on
Solana. Payments are verified against the ledger before anything is marked paid.

This is a **request-and-fulfil** product, not a live-inventory marketplace. Nothing is listed,
nothing is bid on, and no supplier sees a member's budget.

**Live on Solana mainnet:** [solcierge.xyz](https://solcierge.xyz)

---

## Colosseum hackathon

### What it is

High-end concierge spend (charters, yachts, villas) is the kind of large, cross-border, time-critical
payment that card rails handle worst: limits, holds, FX spreads, chargebacks a week after the jet has
flown. Solcierge settles it in SOL or USDC, and treats the ledger, not the client, as the source of
truth for whether a booking is paid.

### Try it

1. Open [solcierge.xyz](https://solcierge.xyz), pick a category, and connect Phantom or Solflare. You
   sign a message, not a transaction: that is the whole account.
2. Send a brief. For jets, the From and To fields search about 9,300 airports worldwide, including
   business-aviation fields such as Teterboro, Le Bourget and Farnborough.
3. The operator is alerted on Telegram, quotes in USD from the operator desk (`/admin`), and the
   quote appears on the member's booking.
4. The member accepts the terms and locks a rate: the server converts USD to SOL against Jupiter
   (CoinGecko as fallback) and writes the exact amount down for ten minutes.
5. The member pays. The server reads the transaction from the chain and checks the payer, the
   recipient, the mint and the amount before the booking moves to `paid`. The operator gets a second
   alert with the explorer link.

The full request → quote → pay → verify flow has settled a real payment on mainnet.

### Built during the hackathon

The design, landing page, request flow and payment verifier existed before the hackathon and were
disclosed as prior work. Taken from a local prototype that had never touched a real database to a
live mainnet product during the hackathon:

- **Production on mainnet:** Vercel deployment on solcierge.xyz, Supabase schema applied, and the
  first real end-to-end payment verified on chain.
- **Same-origin RPC proxy** (`src/app/api/rpc`): the browser's Solana connection goes through an
  allow-listed server route, so the RPC provider key never ships to the client and the proxy cannot
  be used as an open relay. Confirmation polls over HTTP instead of websockets.
- **Worldwide airport search** for jet briefs (`src/lib/airports.ts`, built from OurAirports by
  `scripts/build-airports.mjs`), with a one-way / return switch and Depart / Return dates.
- **Operator alerts** over Telegram and email (`src/lib/notify.ts`) for new requests, payments and
  payments that need manual review, sent with `after()` so they never slow a member down.
- **Rate limiting:** per-member and site-wide caps on new requests.
- **Pre-launch compliance pass:** terms acceptance recorded with each payment intent, air charter
  broker disclosure (14 CFR 295), unverifiable marketing claims removed, payment records retained on
  erasure via anonymisation, and server functions moved to Frankfurt next to the database.
- **Security audit, then fixes:** a line-by-line review of every server route, the payment verifier
  and the auth code ([SECURITY-AUDIT.md](SECURITY-AUDIT.md)). All 18 Critical, High, Medium and Low
  findings are fixed, one commit each, most with a regression test: domain-bound sign-in messages,
  a cluster check so test-network funds cannot settle mainnet bookings, verification at
  `finalized`, concurrency-safe rate locks, and same-origin enforcement on every API write. The test
  suite went from 26 to 100.
- **Booking paperwork:** the desk attaches a booking reference, an itinerary and documents to a
  confirmed booking (private storage, short-lived signed URLs), and the member sees them under
  "Your paperwork".
- **Member updates on Telegram:** members link @SolciergeDeskbot with a one-time code and are pinged
  when a quote lands, when a booking is confirmed, and when the desk sends a note.
- **Passenger details for flights:** collected after payment, sealed with AES-GCM before they reach
  the database, and deleted automatically 30 days after travel, or at once on cancellation.
- **Fixes found in production:** a server crash from an ESM-only transitive dependency on Vercel's
  runtime (pinned via `overrides`), and browser RPC calls that mainnet's public endpoint refuses.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15, App Router, React 19, TypeScript |
| Styling | Tailwind CSS 3 over a CSS custom-property token block |
| Data & auth | Supabase (Postgres + Auth) |
| Chain | `@solana/web3.js`, wallet-adapter (Phantom, Solflare), `@solana/spl-token` |
| Price feed | Jupiter, with CoinGecko as automatic fallback |
| Deploy | Vercel |

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev
```

The site renders without any configuration, so you can look at it before wiring a backend.
A banner across the top says what is missing. Browsing works; submitting does not.

### 1. Supabase

Create a project, then run the SQL in order from the SQL editor:

```
supabase/schema.sql   # tables, enums, triggers, RLS
supabase/seed.sql     # optional: covers every request state
```

Both are safe to re-run. Copy the project URL, the anon key and the service role key into
`.env.local`.

### 2. Solana

Set `NEXT_PUBLIC_TREASURY_WALLET` to the address that should receive funds. Start on devnet:

```bash
solana-keygen new --outfile treasury-devnet.json
solana address -k treasury-devnet.json          # paste into NEXT_PUBLIC_TREASURY_WALLET
solana airdrop 2 <your-own-wallet> --url devnet # fund the wallet you will pay from
```

Devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) can be minted from
[spl-token-faucet.com](https://spl-token-faucet.com). The public RPC endpoints are heavily
rate limited; use Helius, Triton or QuickNode for anything beyond a first look.

### 3. Become an operator

Add your wallet address to `ADMIN_WALLETS` (comma-separated), restart, sign in, and `/admin`
opens. `ADMIN_EMAILS` does the same for the email fallback.

### 4. See the seeded bookings as your own

The seed data belongs to fictional members. To adopt the first one, connect once, then:

```sql
update public.users
   set wallet_address = '<your wallet>'
 where id = '11111111-1111-4111-8111-111111111111';
```

You now have a live quote to pay, an expired quote, a paid booking, a fulfilled one and a
cancelled one.

---

## Environment

Every variable is documented in [`.env.example`](.env.example). The ones without an obvious
default:

| Variable | Why |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Every read and write goes through it. Never expose it. |
| `SESSION_SECRET` | Signs the wallet session JWT. `openssl rand -base64 32`. |
| `NEXT_PUBLIC_TREASURY_WALLET` | Receives SOL and USDC. Verification checks credits to this address. |
| `SOLANA_RPC_URL` | Server-side verification. Can be a private endpoint; it never reaches the browser. |
| `ADMIN_WALLETS` | Comma-separated allowlist for `/admin`. Empty means nobody. |
| `RATE_LOCK_SECONDS` | How long a pay-time rate holds. Default 600. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` | Operator alerts on Telegram. Optional. |
| `RESEND_API_KEY`, `ALERT_EMAILS`, `ALERT_FROM` | Operator alerts by email through Resend. Optional. |

---

## How auth works

Two identities resolve to one `users` row.

**Wallet (primary).** A wallet address alone proves nothing, so connecting is not signing in:

1. `GET /api/auth/nonce?wallet=…` issues a challenge nonce in a signed, httpOnly, five-minute
   cookie **bound to that wallet**, and returns the exact message to sign.
2. The wallet signs it. `POST /api/auth/wallet` verifies the ed25519 signature against the
   claimed public key with `tweetnacl`, checks the challenge was issued for that same wallet,
   clears the cookie, upserts the member, and sets a signed session cookie (`jose`, HS256,
   30 days).

What the challenge does and does not guarantee, since it is stateless by design (no table, works
across serverless instances): it proves the challenge came from us, has not expired, and was
issued for the address being claimed, so a captured challenge cannot authenticate a *different*
wallet. It is not server-tracked single use: the cookie is cleared on the response, but a caller
that keeps re-presenting it can retry inside the five-minute window. Doing so requires already
holding a valid signature for that wallet, so it grants nothing new. If strict single use is ever
needed, add a `used_nonces` table with a TTL and check it in `consumeNonce()`.

**Email (fallback).** Supabase Auth magic link. Enough to brief the desk and read quotes;
settling needs a wallet, which the UI says up front rather than at the pay step.

`getViewer()` in `src/lib/auth.ts` resolves either path. Wallet wins when both are present,
since that is the identity that pays.

### Why RLS has no policies

Wallet identity is not a Supabase Auth identity, so PostgREST cannot express "this row belongs
to the connected wallet". Rather than half-enforce it, RLS is **on with zero policies** for
`anon` and `authenticated`, and privileges are revoked from both. The anon key therefore grants
no data access even if it leaks.

All access goes through route handlers holding the service role key, which enforce ownership in
code. The convention that keeps that honest: `getRequest(id, ownerId)` takes the owner as a
**required** argument, so scoping is part of the call rather than something a caller can forget.
Only admin paths pass `null`.

---

## How payment works

The rule: **the client contributes a signature and nothing else that matters.**

1. **Quote.** An operator sets `amount_usd` with an expiry. That figure binds. The `amount_sol`
   column is recorded as indicative at quote time and is never what a member pays.
2. **Lock.** Opening the pay panel calls `POST /api/payments/intent`. The server pulls a live
   SOL/USD rate, converts, and writes a `payment_intents` row: exact amount, recipient, mint,
   and a ten-minute expiry. A visible countdown runs against it. Any earlier open lock on that
   request is expired, so there is only ever one live figure.
3. **Sign.** The browser builds a `SystemProgram.transfer` for SOL, or a
   `createTransferCheckedInstruction` for USDC (creating the treasury's associated token
   account if this is the first USDC payment), and the wallet signs it.
4. **Verify.** `POST /api/payments/verify` takes the intent id and the signature. It reads the
   transaction from RPC and checks, from the ledger:
   - the transaction confirmed and did not error
   - the fee payer matches the member's wallet
   - it did not land before the intent existed
   - for SOL: the treasury's lamport balance rose by at least the locked amount, read from
     `pre/postBalances` rather than by decoding instructions, so a transfer inside a CPI still
     counts
   - for USDC: `pre/postTokenBalances` credited the treasury for the **configured mint**, with
     USDC decimals. Matching on both mint and owner is what stops a worthless look-alike token
     settling a real invoice
   - amounts compare as `BigInt` base units via decimal-string maths, so floating point never
     decides whether an invoice is settled

   Only then does the request move to `paid`. `PATCH /api/admin/requests/[id]/status` refuses to
   set `paid` by hand.

### Failure modes, and what each does

| Situation | Behaviour |
| --- | --- |
| Transaction not yet confirmed | Client polls verify for ~30s. Nothing is lost; the signature is shown so the member can return later. |
| Transaction failed on chain | 402, plain-language message, rate lock stays valid so they can retry. |
| Wrong amount, recipient or mint | 422 naming exactly what was received versus expected. Never marked paid. |
| Signature already used on this request | Idempotent `already_paid`. |
| Signature already used on a **different** request | 409. The unique index on `tx_signature` is the arbiter, so a replay cannot settle two bookings. |
| Two tabs verifying at once | Unique-violation is caught and returns `already_paid`. |
| Lock expired but the transfer landed | Inside a 5 minute grace: accepted normally. Beyond it: the payment is still **recorded** and the member is told the desk will reconcile. Funds have moved, so refusing to record them would be the worse failure. |
| Member declined in wallet | Message says so, lock kept. |
| Insufficient balance | Names the asset that is short. |
| Both price feeds down | The lock is refused with a message suggesting USDC. Quoting still works, because USD is what binds. |
| No USDC account in the wallet | Caught before signing, with a suggestion to pay in SOL. |

---

## Data model

`supabase/schema.sql` is the source of truth.

- **`users`** — `wallet_address` (unique), `email` (unique), `name`. A check constraint requires
  at least one identity.
- **`booking_requests`** — `category`, `details` JSONB, budget band,
  `status` enum `pending | quoted | paid | fulfilled | cancelled`.
- **`quotes`** — `amount_usd` (binding), `amount_sol` / `amount_usdc` (indicative at quote
  time), `expires_at`, `notes`. Notes are shown to the member verbatim.
- **`payment_intents`** — the rate lock. Not in the original spec, and the reason it exists is
  the whole security model: verification has to compare against a number the server wrote down,
  not one the client sent back.
- **`payments`** — one confirmed transfer. `tx_signature` is **unique**.

State machine, enforced server-side in `src/app/api/admin/requests/[id]/status/route.ts`:

```
pending ──quote──▶ quoted ──verified payment──▶ paid ──▶ fulfilled
   │                  │                          │
   └──────────────────┴──────────────────────────┴──▶ cancelled
```

---

## Design system

The whole product themes from one block of CSS custom properties at the top of
`src/app/globals.css`. Tailwind's config maps to those variables, so no component holds a raw
hex value and a re-theme is a change in one place.

- Two font families, never three: Cormorant Garamond (display) and Inter (text), both
  self-hosted by `next/font` with `display: swap`.
- One accent: gold `--accent: #c9a94e`.
- One easing, `--ease: cubic-bezier(.16,.84,.44,1)`, reused in every transition. The only
  exception is the carousel crossfade, which uses a symmetric `ease-in-out`, because a fade on
  an asymmetric curve looks lopsided.

### Motion: one idea per section

A single `IntersectionObserver` (`src/hooks/useReveal.ts`) adds `.in-view`, and every scroll
animation on the site is a CSS end-state keyed off that class. Elements are unobserved once
revealed.

| Section | Its one move |
| --- | --- |
| Hero | Gold glow tracking the cursor, plus a word-by-word entrance on load |
| Category tiles | Staggered fade-up, then hover lift with the zoom on the image only |
| How it works | Each step's hairline draws itself in, `scaleX(0)` to `scaleX(1)` |
| Payment rails | One fade-up for the whole panel; dense content needs stillness |
| Recent commissions | Crossfade carousel, paused by its own observer when off-screen |
| Closing CTA | Hover lift, no entrance animation competing with it |

Staggering is pure CSS: each child carries an inline `--i` and delays by
`calc(var(--i) * 70ms)`. No JS timers.

Guarantees held throughout: `prefers-reduced-motion` is respected sitewide, the cursor glow is
gated in JS **and** hidden by a `@media (hover: none)` safety net, every `<img>` carries explicit
`width`/`height` so nothing shifts, `scroll-padding-top` keeps anchors clear of the header, and
the favicon is cache-busted.

Photography is in `public/media`, sourced from Unsplash under its licence and documented in
[`public/media/CREDITS.md`](public/media/CREDITS.md), including how to swap one out. The `.photo`
class desaturates and darkens every image slightly, which is what makes photos by ten different
photographers read as one palette against the gold.

---

## Project layout

```
src/
  app/
    page.tsx                       landing
    request/[category]/            per-category brief
    account/                       bookings list and detail (pay lives here)
    admin/                         operator desk
    legal/[slug]/                  placeholder terms, marked with open decisions
    api/
      auth/{nonce,wallet,logout}   wallet sign-in
      requests/                    create and list
      payments/{intent,verify}     rate lock, on-chain verification
      admin/{quotes,requests}      operator actions
      price/                       SOL/USD
  components/
    motion/                        Reveal, Stagger, HeroGlow, Crossfade
    auth/                          wallet providers, session, connect button
    request/ pay/ admin/ account/  feature components
    landing/ site/                 page sections and chrome
  lib/
    solana/{verify,transfer}       the security-critical pair
    auth.ts session.ts data.ts     identity and queries
    categories.ts                  all category copy, in one place
```

---

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
node scripts/make-favicon.mjs   # regenerate public/icon.svg after a palette change
```

---

## Deploying to Vercel

1. Push the repo and import it.
2. Add every variable from `.env.example` to the Vercel project. `NEXT_PUBLIC_SITE_URL` must be
   the real deployed origin, or magic-link redirects will bounce to localhost.
3. In Supabase, add `https://your-domain/auth/callback` to the allowed redirect URLs.
4. Switch `NEXT_PUBLIC_SOLANA_CLUSTER` to `mainnet-beta`, set the mainnet USDC mint
   (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`), and point `SOLANA_RPC_URL` at a paid
   endpoint. Leave `NEXT_PUBLIC_SOLANA_RPC_URL` unset so the browser uses the `/api/rpc` proxy and
   the provider key stays on the server.

`/api/payments/verify` sets `maxDuration = 30`, since RPC round trips plus a retry can outlast
the default budget on the Hobby tier.

---

## Known gaps

Honest list of what a real launch still needs.

- **No member email.** Operators get Telegram and email alerts, but quotes and confirmations reach
  members in the app only. Wire the same Resend integration to member-facing status changes.
- **No refunds path.** `cancelled` after `paid` is an operator flag; moving funds back is
  manual. The refund policy is also the least settled legal page.
- **Legal copy is a draft.** Every page is marked, and each open decision is called out inline.
- **Rate limiting covers requests only.** Nonce issuance and sign-in are not limited per IP.
- **Verification is pull-only.** A member who closes the tab mid-payment is picked up when they
  return, but nothing sweeps for orphaned transfers. A cron reconciling open intents against
  treasury history would close that.
- **Single treasury.** No multisig, no per-booking escrow. Consider Squads before real volume.
- **Price feed is spot.** No slippage buffer or sanity band, so a feed returning a wildly wrong
  number would produce a wildly wrong lock. Add a plausibility check against the other source.
