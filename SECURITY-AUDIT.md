# Solcierge security audit

Audit date: 2026-10-05. Scope: everything in `src/`, `supabase/`, `scripts/`, plus
`next.config.mjs`, `vercel.json`, `src/middleware.ts`, `package.json` / `package-lock.json`, the
full git history, the build output in `.next` and `.next-check`, and `solcierge-export.zip`.

Method: line-by-line review of every server route, the payment verifier and transfer builder, the
auth and session code, the schema, and the client components that call the API. Each finding below
was checked against the code. Where exploitability depends on something that can't be seen from the
repo (production env vars, Supabase dashboard settings), the finding says so.

**Status (Phase 2, same day):** every Critical, High, Medium and Low finding is fixed on the
`security-audit` branch, one commit per finding, each with a regression test where the logic is
testable. After every commit, `npm run typecheck`, `npm run lint`, `npm test` (26 tests before,
76 after) and `npm run build:check` all passed. Nothing has been pushed or deployed, and nothing
was changed in Supabase or Vercel. See **Deploying these fixes** at the end before you ship.

Severity scale: **Critical** = a remote attacker can take money, bookings or operator rights with
no special access. **High** = the same, but with a realistic precondition, or a known critical
dependency advisory. **Medium** = a real weakness that needs a misconfiguration, a victim's help,
or only costs money or integrity in edge cases. **Low** = defence in depth, or minor impact.
**Info** = noted, and no change needed now.

---

## Summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| SA-01 | Critical* | Any wallet member can become an operator by claiming an admin email | Fixed (7485770) |
| SA-02 | High | Unverified contact email becomes a login identity (account pre-hijack) | Fixed (59436aa), schema re-run needed |
| SA-03 | High | Members without a wallet can claim someone else's on-chain payment | Fixed (045b433) |
| SA-04 | High | Next.js 15.5.22 has critical advisories (fixed in 15.5.24) | Fixed (e6f1a56) |
| SA-05 | Medium | Verify settles superseded intents and bookings in any state | Fixed (ec756d5, 6d7d843) |
| SA-06 | Medium | No cluster check: test-network funds can settle mainnet bookings | Fixed (91bb1e4) |
| SA-07 | Medium | Sign-in message is not domain-bound (cross-site signature phishing) | Fixed (3f90fce) |
| SA-08 | Medium | `/api/rpc` is an unauthenticated, unthrottled relay onto the RPC quota | Fixed (b6255d6) |
| SA-09 | Medium | One spot price with no cross-check sets the SOL amount owed | Fixed (c39116a); policy needs decision |
| SA-10 | Low | Open redirect in `/auth/callback` (`next` parameter) | Fixed (c3ef325) |
| SA-11 | Low | Payments verified at `confirmed`; missing block time skips time checks | Fixed (75eee01) |
| SA-12 | Low | Race conditions in rate locks and verification | Fixed (a6e7994), schema re-run needed |
| SA-13 | Low | Session JWT hardening (algorithm, audience, secret length, wallet binding) | Fixed (a39295a) |
| SA-14 | Low | No Origin check on state-changing API routes | Fixed (8ccdca3) |
| SA-15 | Low | No security headers | Fixed (240217e) |
| SA-16 | Low | Input validation gaps on auth and id parameters | Fixed (94504e2) |
| SA-17 | Low | No rate limiting on sign-in, rate locks or verification | Fixed per instance (924ab27); shared store needs decision |
| SA-18 | Low | Pay panel allows paying from a wallet other than the signed-in one | Fixed (65265c4) |
| SA-19 | Info | Sessions are 30-day bearer tokens with no server-side revocation | Deferred |
| SA-20 | Info | Sign-in nonce is not server-tracked single use | Deferred |
| SA-21 | Info | Remaining `npm audit` findings are build-time or unreachable | Deferred (no non-breaking fix) |
| SA-22 | Info | No Content-Security-Policy `script-src` | Deferred |
| SA-23 | Info | Supabase settings that can't be checked from the repo | Needs your action (dashboard) |
| SA-24 | Info | `npm run lint` can't run (no ESLint config) | Fixed (ea3b77e) |

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

---

## Phase 2 status

Commits are on the `security-audit` branch, oldest first. Regression tests are listed with each
fix.

| ID | Status | Regression test |
| --- | --- | --- |
| SA-01 | Fixed. Admin rights come from the session wallet or the Supabase-verified email only (`src/lib/admin.ts`). | `src/lib/admin.test.ts` |
| SA-02 | Fixed. Typed contact details are stored on the request, never in `users.email`, and `anonymize_user()` strips them. **Re-run `supabase/schema.sql`.** | `src/lib/contact.test.ts` |
| SA-03 | Fixed. Intent and verify require a wallet session, and `verifyTransfer` takes `expectedPayer` as a required argument. | `verify.test.ts` ("no signed-in wallet") |
| SA-04 | Fixed. Next 15.5.27, plus the non-breaking `npm audit fix` patches. No critical advisories remain. | n/a (`npm audit`) |
| SA-05 | Fixed. `decideSettlement()` auto-settles only the live lock on the live quote of a `quoted` booking. Everything else is recorded as `needs_review` with the reason in the alert. | `src/lib/payments/settlement.test.ts` |
| SA-06 | Fixed. The genesis hash is checked against `NEXT_PUBLIC_SOLANA_CLUSTER` before any transaction is trusted. Hashes confirmed against the public RPCs. | `src/lib/solana/cluster.test.ts` |
| SA-07 | Fixed. SIWS-format message (domain, URI, chain id, issued-at, expiry), rebuilt server-side from the signed nonce. | `src/lib/siws.test.ts` |
| SA-08 | Fixed. `/api/rpc` needs a wallet session and is rate limited per wallet and per IP. Allowlist moved to `src/lib/rpc-policy.ts`. | `rpc-policy.test.ts`, `ratelimit.test.ts` |
| SA-09 | Fixed. Both feeds are queried in parallel and must agree within 2%. One feed is still used alone if the other is down (see Needs decision). | `src/lib/price-check.test.ts` |
| SA-10 | Fixed. `safeNextPath()` allows single-slash relative paths only. | `src/lib/redirect.test.ts` |
| SA-11 | Fixed. Transactions are read at `finalized`, a null block time goes to review, and the pay panel polls about 50 s. | `settlement.test.ts` (SA-11 case) |
| SA-12 | Fixed. One-open-intent index, conditional consume and promote, and the unique-violation path re-reads the winning row. **Re-run `supabase/schema.sql`.** | `settlement.test.ts` (`duplicateOutcome`) |
| SA-13 | Fixed. HS256 pinned, separate audiences, 32-character secret floor, session re-bound to the row's wallet. Existing sessions are signed out once. | `src/lib/tokens.test.ts` |
| SA-14 | Fixed. Middleware returns 403 for cross-origin non-GET `/api/*` requests. Checked against the built server with curl. | `src/lib/origin.test.ts` |
| SA-15 | Fixed. Headers on every path, and `X-Powered-By` removed. Checked on the built server. | `src/lib/security-headers.test.ts` |
| SA-16 | Fixed. Wallet address, sign-in body and UUID validation. | `src/lib/validate.test.ts` |
| SA-17 | Fixed per serverless instance (nonce, sign-in, intent, verify). A shared store needs a decision. | `ratelimit.test.ts` |
| SA-18 | Fixed. The pay panel refuses to build a transfer from a wallet other than the session's. | `src/lib/pay-guard.test.ts` |
| SA-19 | Deferred. Needs a sessions table or a per-user token version. | — |
| SA-20 | Deferred. SA-07 removes the cross-site use. A `used_nonces` table would close the rest. | — |
| SA-21 | Deferred. The remaining advisories need breaking major upgrades (Tailwind 4, spl-token) and aren't reachable at runtime. | — |
| SA-22 | Deferred. Needs nonce-based CSP and testing with the wallets. | — |
| SA-23 | Your action in the Supabase dashboard (see below). | — |
| SA-24 | Fixed. ESLint flat config. The two purely stylistic rules that flagged existing copy are off. | n/a |

Not unit-testable, so covered by the manual checks below: the Supabase calls themselves
(conditional updates, the unique index), the route wiring of the rate limiters, and the pay
panel's behaviour in a real wallet.

## Needs decision

1. **Single price feed (SA-09).** When one of Jupiter or CoinGecko is down, SOL locks still go
   ahead on the other alone. That keeps SOL payable during an outage, at the cost of no
   cross-check. The alternative is to refuse SOL locks (USDC only) until both answer. Your call
   on availability versus safety.
2. **Shared rate-limit store (SA-17, SA-08).** The limits hold per serverless instance. Limits
   that hold globally need Upstash Redis or Vercel KV, which means a new account or integration
   and possibly cost.
3. **Existing unverified emails in `users` (SA-02).** Rows created before this fix may hold an
   email a wallet member typed but never verified. Whoever owns that address would land in that
   member's account on a magic-link sign-in. Decide whether to keep those emails (you know your
   few members) or clear them. To see them (read-only):
   `select id, wallet_address, email, created_at from public.users where wallet_address is not null and email is not null;`
4. **Email linking (SA-02 follow-on).** Wallet members can no longer reach their account by
   magic link through a typed contact email. If you want wallet and email linked, it needs a
   verified flow: send a link to the address and link it on click.

## Secrets

No secret values were found in the working tree, the git history (the repo is public), the build
output or `solcierge-export.zip`. **Nothing needs rotating** on the evidence available. I didn't
read or print any secret value; the scan matched files against the local values and key-shaped
patterns and printed only file names and counts.

The Vercel values are the ones I couldn't see. That includes whether production `ADMIN_EMAILS`
is set, which decides whether SA-01 was exploitable in production (see Deploying, step 1).

## What could not be verified statically

- **Production env.** `ADMIN_EMAILS` (SA-01 exposure), the length of `SESSION_SECRET` (SA-13 now
  enforces at least 32 characters), and whether `SOLANA_RPC_URL` matches the cluster (SA-06 now
  enforces it).
- **Supabase dashboard.** The auth redirect allowlist, email rate limits, CAPTCHA, and the
  default privileges in `public`.
- **Wallet behaviour.** That Phantom and Solflare render the SIWS message cleanly and warn on a
  domain mismatch (both document this, but I couldn't run a wallet here).
- **The schema changes** in `supabase/schema.sql`. There is no local Postgres, so the SQL is
  reviewed but not executed.
- **Next.js advisory details** (SA-04). I couldn't read them offline, so the "preconditions not
  met" judgement is a suspicion. The upgrade makes it moot.
- **Vercel's HSTS header** and whether Vercel overwrites `x-forwarded-for` (which the limiter
  relies on). Both are Vercel defaults, but check with `curl -I`.
- **Live chain behaviour:** the finalized-commitment latency and the genesis check against your
  paid RPC.

## Deploying these fixes

1. **Check SA-01 exposure first.** In Vercel, check whether `ADMIN_EMAILS` is set. If it is, look in
   `users` for wallet rows carrying one of those emails (query under
   Needs decision, item 3). Any such row is someone who could have reached the desk.
2. **Check `SESSION_SECRET` is at least 32 characters** in Vercel. If it is shorter, the site
   treats it as missing and nobody can sign in. Regenerate it with `openssl rand -base64 32`.
3. **Re-run `supabase/schema.sql`** in the SQL editor. It is idempotent. It adds the
   one-open-intent index (SA-12) and the updated `anonymize_user()` (SA-02).
4. Deploy. Every member is signed out once (SA-13) and signs the new SIWS message on next connect.
5. **Don't push this branch, or this file, to the public GitHub repo until the deploy is live.**
   It describes exploitable issues in the currently deployed version.

## Manual tests on devnet

Run against a preview deployment with `NEXT_PUBLIC_SOLANA_CLUSTER=devnet` and a devnet
`SOLANA_RPC_URL`.

1. **Sign-in.** Connect Phantom, then Solflare. The prompt shows
   "<your host> wants you to sign in…" with no domain warning, and sign-in succeeds. Old cookies
   are signed out.
2. **Admin.** An `ADMIN_WALLETS` wallet sees `/admin`. A normal wallet that submitted a request
   with an admin email as contact does **not**.
3. **Pay SOL and USDC.** Lock, pay and verify. The booking goes to `paid` after about 15–30 s
   (finalized). The Telegram alert arrives.
4. **Superseded lock.** Lock a rate and leave the panel open. Re-quote from `/admin`, then pay
   from the old panel. Expect "desk will reconcile" (`needs_review`), the booking not paid, and a
   Telegram "Payment needs review" naming the earlier quote.
5. **Cancelled booking.** Lock, cancel from `/admin`, then pay. Expect `needs_review`.
6. **Switched account.** Sign in, switch the Phantom account, press pay. The panel refuses before
   opening the wallet.
7. **Email-only member.** Sign in by magic link. The pay panel can't lock a rate (403 message).
8. **Cluster check.** Set `SOLANA_RPC_URL` to mainnet while the cluster says devnet. Verify
   answers "not fully configured" (503) instead of reading the chain.
9. **RPC proxy.** Signed out, `curl -X POST https://<preview>/api/rpc` returns 401.
10. **Headers and CSRF.** `curl -I https://<preview>/` shows the security headers and HSTS.
    `curl -X POST -H "Origin: https://evil.example" https://<preview>/api/auth/logout` returns 403.
11. **Magic link.** Sign in by email and land on `/account`. Hand-edit `next=//example.com` on a
    callback URL and confirm it never leaves the site.
