# Solcierge security audit

Audit date: 2026-10-05. Scope: everything in `src/`, `supabase/`, `scripts/`, plus
`next.config.mjs`, `vercel.json`, `src/middleware.ts`, `package.json` / `package-lock.json`, the
full git history, the build output in `.next` and `.next-check`, and `solcierge-export.zip`.

Method: line-by-line review of every server route, the payment verifier and transfer builder, the
auth and session code, the schema, and the client components that call the API. Each finding below
was checked against the code. Where exploitability depends on something that can't be seen from the
repo (production env vars, Supabase dashboard settings), the finding says so.

Severity scale: **Critical** = a remote attacker can take money, bookings or operator rights with
no special access. **High** = the same, but with a realistic precondition, or a known critical
dependency advisory. **Medium** = a real weakness that needs a misconfiguration, a victim's help,
or only costs money or integrity in edge cases. **Low** = defence in depth, or minor impact.
**Info** = noted, and no change needed now.

---

## Summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| SA-01 | Critical* | Any wallet member can become an operator by claiming an admin email | Open |
| SA-02 | High | Unverified contact email becomes a login identity (account pre-hijack) | Open |
| SA-03 | High | Members without a wallet can claim someone else's on-chain payment | Open |
| SA-04 | High | Next.js 15.5.22 has critical advisories (fixed in 15.5.24) | Open |
| SA-05 | Medium | Verify settles superseded intents and bookings in any state | Open |
| SA-06 | Medium | No cluster check: test-network funds can settle mainnet bookings | Open |
| SA-07 | Medium | Sign-in message is not domain-bound (cross-site signature phishing) | Open |
| SA-08 | Medium | `/api/rpc` is an unauthenticated, unthrottled relay onto the RPC quota | Open |
| SA-09 | Medium | One spot price with no cross-check sets the SOL amount owed | Open |
| SA-10 | Low | Open redirect in `/auth/callback` (`next` parameter) | Open |
| SA-11 | Low | Payments verified at `confirmed`; missing block time skips time checks | Open |
| SA-12 | Low | Race conditions in rate locks and verification | Open |
| SA-13 | Low | Session JWT hardening (algorithm, audience, secret length, wallet binding) | Open |
| SA-14 | Low | No Origin check on state-changing API routes | Open |
| SA-15 | Low | No security headers | Open |
| SA-16 | Low | Input validation gaps on auth and id parameters | Open |
| SA-17 | Low | No rate limiting on sign-in, rate locks or verification | Open |
| SA-18 | Low | Pay panel allows paying from a wallet other than the signed-in one | Open |
| SA-19 | Info | Sessions are 30-day bearer tokens with no server-side revocation | Open |
| SA-20 | Info | Sign-in nonce is not server-tracked single use | Open |
| SA-21 | Info | Remaining `npm audit` findings are build-time or unreachable | Open |
| SA-22 | Info | No Content-Security-Policy `script-src` | Open |
| SA-23 | Info | Supabase settings that can't be checked from the repo | Open |
| SA-24 | Info | `npm run lint` can't run (no ESLint config) | Open |

\* Critical when `ADMIN_EMAILS` is set in production. The local `.env.local` has it empty. I
couldn't see the Vercel value.

---

## Findings

### SA-01 — Any wallet member can become an operator by claiming an admin email

**Severity:** Critical (conditional) · **Confirmed in code** · exploitable only if production
`ADMIN_EMAILS` is non-empty and that address has no `users` row yet

**Where:** `src/app/api/requests/route.ts:95-103`, `src/lib/auth.ts:39` and `:66-70`

`POST /api/requests` copies the unverified `contact_email` field into `users.email` the first time
a member supplies one. `getViewer()` then decides admin rights with
`isAdminIdentity(data.wallet_address, data.email)`, using that **database** email even for a
wallet session.

**Exploit:** connect any fresh wallet and submit one request with
`contact_email: "<an ADMIN_EMAILS address>"`. On the next page load `isAdmin` is true. `/admin`
opens, every member's brief, wallet, email and name is readable, and `POST /api/admin/quotes` is
allowed. The attacker quotes their own jet charter at `amount_usd: 0.01`, pays one cent of USDC,
and the booking verifies as `paid`. Admin addresses are easy to guess (the site's own domain, the
operator's public email).

**Fix:** decide admin rights only from the identity this session actually proved: the wallet in
the signed session cookie, or the email in a Supabase Auth session. Never from a column a member
can write.

### SA-02 — Unverified contact email becomes a login identity (account pre-hijack)

**Severity:** High · **Confirmed in code**

**Where:** `src/app/api/requests/route.ts:95-103`, `src/lib/auth.ts:127-154`, `src/lib/auth.ts:55`

The same backfill makes an unverified email a login key. `upsertUserByEmail()` resolves a
magic-link sign-in to whichever row has that email.

**Exploit:** an attacker's wallet account claims `victim@example.com` as its contact email. When
the real owner later signs in by magic link, `getViewer()` finds the attacker's row and signs the
victim **into the attacker's account**. Every brief the victim then sends (names, travel dates,
destinations) lands in an account the attacker can read with their wallet. The `users.email`
unique constraint also stops the victim from ever getting their own account.

**Fix:** stop writing unverified emails into `users.email`. Keep the contact name and email on the
request (`details.contact_name`, `details.contact_email`), where the desk and the Telegram alert
still see them, and extend `anonymize_user()` to strip them. Only a verified magic-link sign-in
creates an email identity.

### SA-03 — Members without a wallet can claim someone else's on-chain payment

**Severity:** High · **Confirmed in code**

**Where:** `src/app/api/payments/verify/route.ts:110`, `src/lib/solana/verify.ts:105`,
`src/app/api/payments/intent/route.ts:29`

The verifier binds a transfer to the member only through
`expectedPayer: viewer.wallet_address`. For an email-only member that is `null`, and the payer
check is skipped. Neither the intent route nor the verify route requires a wallet.

**Exploit:** an attacker signs in by email, gets a small booking quoted (a dinner table), and keeps
a fresh rate lock open. They watch the treasury address (public, and a websocket subscription is
enough). When any member's payment lands for at least the attacker's amount in the same token,
they post that signature to `/api/payments/verify` before the victim's browser does. The victim's
browser waits for `confirmed` before verifying, so the race is winnable. The attacker's booking is
marked `paid` with the victim's money, and the victim gets "already used to settle a different
booking". A member who closed the tab mid-payment can be claimed at leisure.

**Fix:** rate locks and verification require a wallet session, and the payer check always runs
against the session wallet.

### SA-04 — Next.js 15.5.22 has critical advisories

**Severity:** High (advisories rate them Critical) · **Confirmed by `npm audit`**

**Where:** `package.json` (`next ^15.5.0`, lockfile at 15.5.22)

`npm audit` reports GHSA-2xp9-vwfh-vxw4 (RCE in the Image Optimization API with AVIF files) and
GHSA-p293-qw3h-jr36 (RCE on Windows-hosted servers), both fixed in 15.5.24. The app doesn't use
`next/image` or allow remote image patterns, and runs on Linux, so the preconditions **appear**
unmet. I couldn't read the advisory details offline, so treat that as a suspicion, not proof. The
upgrade is a patch bump inside 15.5.

**Fix:** upgrade to the latest 15.5 patch (15.5.27).

### SA-05 — Verify settles superseded intents and bookings in any state

**Severity:** Medium · **Confirmed in code**

**Where:** `src/app/api/payments/verify/route.ts:95-100`, `:163`, `:186-190`;
`src/app/api/payments/intent/route.ts:46-57`

`/api/payments/verify` never checks that the intent is still `open`, that it was taken against the
request's **current** quote, or that the booking is `quoted`. It refuses only `paid` and
`fulfilled`. The intent route likewise locks a rate for a `pending` request that still has an old
quote.

**Exploit:**
- The operator re-quotes upward, which expires open intents. A member who held the old lock pays
  the old, lower amount inside the lock window, and the booking goes straight to `paid`.
- The operator cancels a request, or moves it back to sourcing. A transfer against an old intent
  still moves it to `paid`, which skips the state machine that the status route enforces.
- A second transfer against an already-consumed intent is also auto-accepted.

**Fix:** once a transfer is proven, always record it, since the funds have moved. Auto-promote to
`paid` only when the intent is `open`, its quote is still the newest, and the booking is still
`quoted`. Otherwise return `needs_review` and alert the desk with the reason. Intents can only be
taken on `quoted` requests.

### SA-06 — No cluster check: test-network funds can settle mainnet bookings

**Severity:** Medium · **Confirmed in code** · needs a misconfiguration

**Where:** `src/lib/solana/connection.ts:9`, `src/lib/env.ts:64`

The verifier trusts whatever cluster `SOLANA_RPC_URL` points at. Production was switched from
devnet to mainnet by env vars once already. If `SOLANA_RPC_URL` (or the
`NEXT_PUBLIC_SOLANA_RPC_URL` fallback) is left on devnet while `NEXT_PUBLIC_SOLANA_CLUSTER` says
mainnet, then free devnet SOL, or devnet USDC from the public faucet, verifies against real
mainnet bookings.

**Fix:** before trusting any transaction, check the RPC's genesis hash against the configured
cluster. Cache the result, and refuse with a 503 on a mismatch.

### SA-07 — Sign-in message is not domain-bound

**Severity:** Medium · **Confirmed in code** · needs the victim to sign on a malicious site

**Where:** `src/lib/session.ts:108-118`, `src/app/api/auth/nonce/route.ts:17`

The signed text names no domain, URI, chain or time. Anyone can fetch a valid challenge for a
victim's wallet from `/api/auth/nonce` (the cookie lands in the attacker's own jar), then show the
identical message on a look-alike site.

**Exploit:** the victim signs on the phishing site. Nothing in the text is tied to solcierge.xyz,
so the wallet can't warn. The attacker posts the signature with their own nonce cookie and gets a
30-day session as the victim: every booking, quote and contact detail.

**Fix:** use the Sign-In-With-Solana (SIWS) message format with domain, URI, chain ID, issued-at
and expiry. Phantom and Solflare check that format's domain against the page origin and warn on a
mismatch. The server rebuilds the exact text from the signed nonce token, so it never trusts the
client's copy.

### SA-08 — `/api/rpc` is an unauthenticated, unthrottled relay

**Severity:** Medium · **Confirmed in code**

**Where:** `src/app/api/rpc/route.ts:39-71`

The allowlist stops arbitrary methods, but anyone on the internet can drive `getMultipleAccounts`
(10 calls of up to 100 accounts each per request), `simulateTransaction` and `sendTransaction`
through the server's RPC endpoint without limit. Once the Helius key is wired in, that is a direct
way to burn the paid quota, or get the key rate limited, which takes verification down with it.

**Fix:** require a valid wallet session (the pay panel is the only caller, and it is always signed
in) and apply per-IP and per-session limits.

### SA-09 — One spot price with no cross-check sets the SOL amount owed

**Severity:** Medium · **Confirmed in code** · no attacker control demonstrated

**Where:** `src/lib/price.ts:60-78`, `src/app/api/payments/intent/route.ts:63-68`

The SOL lock uses the first feed that answers, with no comparison against the second and no sanity
band. A bad print from Jupiter (an outage artefact or a bad pool) becomes the binding amount for a
ten-minute lock. A price that is too high under-charges the member, and there is no recovery after
`paid`.

**Fix:** query both feeds in parallel. When both answer and differ by more than 2%, refuse the lock
(the member can pay in USDC) and log it. When only one answers, keep today's behaviour. Whether a
single feed should be enough is listed under Needs decision.

### SA-10 — Open redirect in `/auth/callback`

**Severity:** Low · **Confirmed in code**, exploitation limited by PKCE

**Where:** `src/app/auth/callback/route.ts:10`, `:26`

`new URL(next, url.origin)` follows `//evil.example` and `https://evil.example` off-site. The
redirect only happens after a successful code exchange, and `@supabase/ssr` uses PKCE, so an
attacker can't easily get a victim's browser to complete one with a hostile `next`. That is why
this is Low.

**Fix:** accept only same-origin relative paths: a single leading `/`, and no `//` or `/\`.
Anything else falls back to `/account`.

### SA-11 — Payments verified at `confirmed`; missing block time skips time checks

**Severity:** Low · **Confirmed in code**

**Where:** `src/lib/solana/connection.ts:21-24`, `src/lib/solana/verify.ts:111`,
`src/app/api/payments/verify/route.ts:135`

`confirmed` (optimistic confirmation) has never been rolled back on mainnet in practice, but
`finalized` is the standard for marking an irreversible high-value order as paid. Separately, when
the RPC returns `blockTime: null`, the "predates the quote" check and the late-payment check are
both skipped, so a transfer of unknown time auto-settles.

**Fix:** fetch at `finalized` (about 13 s more, inside the pay panel's 30 s polling window). Treat
an unknown block time as `needs_review`.

### SA-12 — Race conditions in rate locks and verification

**Severity:** Low · **Confirmed in code**

**Where:** `src/app/api/payments/intent/route.ts:85-110`,
`src/app/api/payments/verify/route.ts:152-163`, `:186-190`

- Two concurrent rate locks both expire the old one, then both insert, leaving two `open` intents.
- When two requests verify one signature concurrently, the loser's unique-violation path answers
  `already_paid` without checking which booking the winner settled. The UI reports "paid" for a
  booking that isn't.
- The final `update … status = 'paid'` isn't conditional on the booking still being `quoted`, so it
  can overwrite a concurrent operator cancel.

**Fix:** add a partial unique index allowing one open intent per request, and handle its violation.
On a payment unique-violation, re-read the winning row. Consume the intent and promote the booking
with conditional updates (`status = 'open'`, `status = 'quoted'`), falling back to `needs_review`
if either loses.

### SA-13 — Session JWT hardening

**Severity:** Low · **Confirmed in code**

**Where:** `src/lib/session.ts:19-23`, `:40`, `:100`; `src/lib/env.ts:63`; `src/lib/auth.ts:25-42`

- `jwtVerify` doesn't pin `algorithms`. jose rejects `none` and asymmetric algorithms for a secret
  key, so this isn't exploitable, but the algorithm should be pinned.
- Nonce and session tokens share one key with no audience. They are told apart only by claim
  shape.
- `SESSION_SECRET` has no minimum length. The local value is 44 characters. The production value
  wasn't checked.
- `getViewer()` loads the user by `userId` without checking that the row still holds the wallet the
  session was issued for. After `anonymize_user()`, a stolen cookie still resolves for up to 30 days.

**Fix:** pin HS256, set separate audiences, refuse a secret under 32 characters, and require the
row's wallet to match the session's. Existing sessions are signed out once on deploy.

### SA-14 — No Origin check on state-changing API routes

**Severity:** Low · **Confirmed in code**

**Where:** `src/middleware.ts`

The CSRF defence is `SameSite=Lax` alone. That holds against other sites, but not against a
same-site sibling subdomain, and `request.json()` accepts a `text/plain` body built by a form.

**Fix:** in middleware, reject non-GET `/api/*` requests whose `Origin` (or `Sec-Fetch-Site`)
shows another origin.

### SA-15 — No security headers

**Severity:** Low · **Confirmed in code** (`next.config.mjs` sets none)

SameSite=Lax means a framed copy of the site would be signed out, which limits clickjacking. The
headers are still free.

**Fix:** set `frame-ancestors 'none'` / `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and
`base-uri`, `object-src` and `form-action` restrictions. Vercel already sends HSTS (check that
manually).

### SA-16 — Input validation gaps

**Severity:** Low · **Confirmed in code**

**Where:** `src/app/api/auth/nonce/route.ts:14`, `src/app/api/auth/wallet/route.ts:10,19`,
`src/app/api/admin/requests/[id]/status/route.ts:26`, `src/app/account/[id]/page.tsx:38`,
`src/lib/data.ts:60`

- The nonce route signs any string as the "wallet", including kilobytes of text inside a cookie.
- `/api/auth/wallet` has no schema.
- Non-UUID ids reach Postgres and come back as 500s instead of 404s.

**Fix:** validate the wallet as a public key, add a zod schema, and return null or 404 for
non-UUID ids in `getRequest` and the status route.

### SA-17 — No rate limiting on sign-in, rate locks or verification

**Severity:** Low · **Confirmed in code**

Only request creation is limited. Nonce issuance, sign-in (each fresh keypair creates a `users`
row), rate locks (each one hits the price feeds once the cache expires) and verification (each one
is an RPC `getTransaction`) are unlimited.

**Fix:** a per-instance in-memory limiter on each route now. A shared store (Upstash or Vercel KV)
for limits that hold across serverless instances is listed under Needs decision.

### SA-18 — Pay panel allows paying from a wallet other than the signed-in one

**Severity:** Low · **Confirmed in code**

**Where:** `src/components/pay/PayPanel.tsx:152-170`

If the wallet extension switches accounts after sign-in, the panel builds the transfer from the
new account. The money reaches the treasury, the server rejects it as "signed by a different
wallet", and the transfer isn't recorded anywhere, so the desk has to find it by hand.

**Fix:** refuse to build the transfer unless the connected wallet is the session wallet, and say
so.

### SA-19 — Sessions are 30-day bearer tokens with no server-side revocation (Info)

Logout clears the cookie, but a copied token stays valid until it expires. Admin rights are
re-derived on every request, so removing a wallet from `ADMIN_WALLETS` does take effect at once.
Revocation needs a sessions table or a per-user token version. **Deferred.**

### SA-20 — Sign-in nonce is not server-tracked single use (Info)

Documented in `session.ts`. Replay needs a valid signature for the same wallet, and SA-07 closes
the cross-site case. **Deferred.**

### SA-21 — Remaining `npm audit` findings (Info)

After SA-04, the remaining advisories are in:

- Transitive Solana dependencies (`bigint-buffer` via `@solana/spl-token`; `jayson`, `uuid` and
  `stream-json` via `@solana/web3.js`). These are client-side transaction building, and none of
  the affected functions is fed attacker input on the server.
- Build-time tooling (`tailwindcss` 3 → chokidar/braces/micromatch, `postcss`).
- `react-native` / `metro`, pulled in as an unused peer of the mobile wallet adapter.

None has a fix without a breaking major upgrade. No package version matches the known-compromised
lists I checked: the Dec 2024 `@solana/web3.js` 1.95.6/1.95.7 backdoor, the Sept 2025
chalk/debug hijack, `@ctrl/tinycolor` and the Shai-Hulud family, the nx and eslint-config-prettier
incidents, and older ones. Install scripts are limited to `sharp`, `bufferutil`, `utf-8-validate`,
`bigint-buffer` and `fsevents`, and every package resolves from registry.npmjs.org. My knowledge
of compromises after mid-2026 is limited.

### SA-22 — No Content-Security-Policy `script-src` (Info)

React escapes everything rendered and there is no `dangerouslySetInnerHTML`, so there is no XSS
sink today. A strict `script-src` needs nonces through middleware and testing against Phantom and
Solflare (the Solflare SDK uses an iframe). **Deferred.**

### SA-23 — Supabase settings that can't be checked from the repo (Info)

- Default privileges in `public` still grant new tables to `anon`/`authenticated`. Any future
  table needs RLS enabled and the same `revoke`.
- Magic links are sent by the browser with the anon key. Supabase Auth's email rate limits, and
  CAPTCHA if possible, should be configured when Resend becomes the SMTP provider.
- Check that the redirect allowlist holds only `https://solcierge.xyz/auth/callback`, not a
  wildcard.

### SA-24 — `npm run lint` can't run (Info)

There is no ESLint config, so `next lint` stops at an interactive setup prompt.

**Fix:** add a minimal flat config so lint runs non-interactively.

---

## Checked and found sound

- **USDC matching.** The verifier filters `pre/postTokenBalances` by both the configured mint and
  the treasury owner, computes deltas per account index, and requires 6 decimals. A look-alike
  mint, a credit to some other owner, or a token with other decimals is refused. Changing a token
  account's owner to the treasury yields a zero delta.
- **Token programs.** The mint is pinned per intent, so Token-2022 extension tricks (transfer fees,
  permanent delegate) don't apply. The transfer builder picks the program from the mint owner.
- **Ledger reading.** SOL credit comes from the treasury's lamport delta, so CPIs and inner
  instructions count and can't be faked. Failed transactions (`meta.err`) are refused.
- **Amounts.** Comparison is in BigInt base units. The 1-base-unit `DUST` slack is negligible.
  Intent amounts are computed with float division then `toFixed`. That is consistent on both sides
  and not exploitable, but a decimal library would be cleaner.
- **Ownership (IDOR).** `getRequest(id, ownerId)` scopes every member read. Verify checks that the
  intent's booking belongs to the caller. `/account/[id]` 404s for others' bookings.
- **Operator routes.** Both admin API routes call `requireAdmin()`. `/admin` checks `isAdmin`
  server-side before loading data. Middleware does no auth, so there is nothing to bypass.
- **The `paid` state.** The status route refuses `paid`. The amount, recipient and mint always come
  from the stored intent. `tx_signature` is unique.
- **Secrets.** No secret values in the working tree, any commit in history, `.next`,
  `.next-check` or `solcierge-export.zip`. Checked both by matching the real local values and by
  key-shaped patterns (Supabase JWT and `sb_secret_`, Telegram, Resend, Helius, PEM, keypair
  arrays, GitHub, AWS). Only `.env.example` was ever committed. The production client build has no
  server env names in it. `.env.local` (gitignored) holds a `VERCEL_OIDC_TOKEN`, which is
  short-lived.
- **Alerts.** Telegram text is HTML-escaped (`& < >`, all that HTML parse mode needs), and links
  are built from config, not member input. Email alerts are plain text.
- **Cookies.** `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- **Database.** RLS is on with zero policies, privileges are revoked from `anon` and `authenticated`,
  and `anonymize_user()` is not executable by them.
