# Handoff

Context that lives in the build conversation rather than in the code. Read this first,
then [README.md](README.md) for setup.

## Where this stands

The front end is complete and verified. The backend is written but **has never run
against a real Postgres** — that is the single biggest open item.

| Area | State |
| --- | --- |
| Landing page, request flow, motion layer | Done, verified in browser |
| Operator desk (`/admin`), account pages | Written, renders, untested against real data |
| Wallet auth (sign-in-with-Solana) | Done, signature path tested end to end with real keypairs |
| Payment verification | Done, 19 unit tests against synthetic transactions |
| Supabase schema and seed SQL | Written and reviewed by eye, **never executed** |
| Email magic-link fallback | Written, untested (needs a real Supabase project) |

`.env.local` is deliberately **not** in this archive. Copy `.env.example` to `.env.local`
and fill it in. Until you do, the site renders with a banner at the top saying setup is
incomplete: browsing works, submitting does not.

## First things to do

1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql`.
3. Fill in `.env.local`, add your wallet to `ADMIN_WALLETS`.
4. `npm run dev`

Then exercise the flow that has never run: submit a request, quote it from `/admin`, pay
it on devnet. That is where undiscovered bugs will be, not in the UI.

## Decisions you would otherwise have to rediscover

**Colour tokens are RGB channel triplets, not hex.** `--bg: 8 7 10`, consumed as
`rgb(var(--bg) / <alpha-value>)`. This is required for Tailwind's opacity modifiers to
work; with hex tokens, `bg-bg/70` silently renders transparent white. That bug shipped
once and affected 22 usages before it was caught.

**`getRequest(id, ownerId)` takes the owner as a required argument.** RLS is on with zero
policies and all access goes through route handlers on the service-role key, so ownership
is enforced in code. Making the owner a required parameter is what stops a caller
forgetting it. Pass `null` only from admin paths.

**Only `/api/payments/verify` may set a request to `paid`.** The admin status endpoint
refuses that transition. Amount, recipient and mint are read from the stored
`payment_intents` row, never from the request body.

**`payment_intents` is not in the original spec.** It exists because verification has to
compare against a number the server wrote down. Removing it would break the security
model.

**The motion split:** entrance animations are CSS driven by one shared
`IntersectionObserver`; Framer Motion is used only where motion tracks a continuous input
(scroll offset, pointer position). Framer is imported as `m` inside `LazyMotion strict` —
a stray `motion.div` will throw rather than quietly pull in the full bundle.

**The clock uses Inter, not the display serif.** Cormorant Garamond has old-style figures
that sit at different heights and widths, which makes a ticking readout jump and bleed
through the odometer mask. See the `.odometer` block in `globals.css`.

**No custom cursor.** Two were built (a spring-following gold ring, then a gold arrow) and
both read as cheap. The reasoning is recorded in `globals.css` so it does not get
re-added.

**`npm run build:check`** builds into `.next-check` instead of `.next`. Use it while a dev
server is running; a normal `npm run build` overwrites the dev server's chunks and it
starts throwing `Cannot find module './xxx.js'`.

## Known gaps

Full list at the end of [README.md](README.md). The ones that matter most:

- **No email delivery.** Quotes and confirmations appear in the app only.
- **No refunds path.** `cancelled` after `paid` is an operator flag; moving funds back is
  manual. This is also the least settled legal page.
- **Legal copy is a draft.** Every open question is marked `OPEN DECISION` inline.
- **No rate limiting** on request creation or nonce issuance.
- **Verification is pull-only.** A member who closes the tab mid-payment is picked up when
  they return, but nothing sweeps for orphaned transfers. A cron reconciling open intents
  against treasury history would close it.
- **Single treasury**, no multisig. Consider Squads before real volume.
- **Price feed is spot**, with no plausibility band. A feed returning a wildly wrong number
  would produce a wildly wrong lock.

## Media licensing

Everything in `public/media` is licensed for commercial use and documented in
[public/media/CREDITS.md](public/media/CREDITS.md): stills from Unsplash, the hero video
cut from four Pexels clips by `scripts/build-hero-video.sh`.

A YouTube download was offered as hero footage during the build and **not used**: it was a
third party's finished edit, complete with title card and a subscribe outro. Please keep
that line — trimming the branding off someone else's production does not make it
licensed.

## Things I could not verify

Called out honestly so you know where to look:

- The card hover choreography and the cursor-following hero glow. The preview pane used
  during the build kept collapsing to zero size and throttling animation frames, so these
  were confirmed via the CSSOM and computed styles rather than seen moving.
- Anything touching the database, per the table above.
- The hypercar beat of the hero loop contains distant pedestrians on a public street.
  Unrecognisable at 70% opacity behind the scrims, but swap it if you would rather not.
