-- ===========================================================================
-- Solcierge seed data
-- Covers every value of request_status, both payment tokens, an expired quote
-- and an expired rate lock, so each UI state is reachable without clicking
-- through the whole funnel.
--
-- Run after schema.sql. Idempotent: fixed UUIDs + on conflict do nothing.
--
-- The two tx_signature values are well-formed base58 but are not real transactions, so
-- their explorer links will 404. That is the one thing seed data cannot fake. To see a
-- genuine receipt, pay a seeded quote yourself on devnet.
--
-- To see these as *your* bookings, set the wallet on the first seed member to
-- your own address after connecting once:
--   update public.users
--      set wallet_address = '<your wallet>'
--    where id = '11111111-1111-4111-8111-111111111111';
-- ===========================================================================

insert into public.users (id, wallet_address, email, name) values
  ('11111111-1111-4111-8111-111111111111', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'a.moreau@example.com', 'Adrien Moreau'),
  ('22222222-2222-4222-8222-222222222222', 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd', 'r.okafor@example.com', 'Rume Okafor'),
  ('33333333-3333-4333-8333-333333333333', 'BQWWFhzBdw2vKKBUX17NHeFbCoFQHfRARpdztPE2tDJ', null, 'Sana Ibrahim'),
  ('44444444-4444-4444-8444-444444444444', null, 'l.vance@example.com', 'Lena Vance')
on conflict (id) do nothing;

-- --- pending ---------------------------------------------------------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa1-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'jets',
   '{"origin":"Nice (NCE)","destination":"Ibiza (IBZ)","start_date":"2026-08-14","end_date":"2026-08-14","party_size":6,"details":"Midday departure. Heavy luggage, two sets of golf clubs. Prefer a Challenger 350 or better. Ground transfer at both ends."}'::jsonb,
   28000, 42000, 'pending', now() - interval '3 hours'),

  ('aaaaaaa1-0000-4000-8000-000000000002',
   '33333333-3333-4333-8333-333333333333',
   'dining',
   '{"location":"Tokyo, Aoyama","start_date":"2026-09-02","party_size":2,"details":"Counter seating at a two or three star sushi room. No substitutions on the omakase. Anniversary, so a quiet corner if the room has one."}'::jsonb,
   1200, 3000, 'pending', now() - interval '1 day'),

  ('aaaaaaa1-0000-4000-8000-000000000003',
   '44444444-4444-4444-8444-444444444444',
   'bespoke',
   '{"location":"Reykjavik","start_date":"2026-11-20","end_date":"2026-11-24","party_size":4,"details":"Four nights chasing the aurora. Want a glass-roof lodge outside the light dome, a private guide with forecasting experience, and a photographer for one night."}'::jsonb,
   35000, 60000, 'pending', now() - interval '2 days')
on conflict (id) do nothing;

-- --- quoted (live) ---------------------------------------------------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa2-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'yachts',
   '{"location":"Amalfi Coast","start_date":"2026-08-22","end_date":"2026-08-29","party_size":8,"details":"Seven nights, Positano to Capri and back. Sleeps eight in four cabins. Chef aboard, tender for waterskiing, no smoking anywhere below deck."}'::jsonb,
   180000, 240000, 'quoted', now() - interval '4 days'),

  ('aaaaaaa2-0000-4000-8000-000000000002',
   '22222222-2222-4222-8222-222222222222',
   'cars',
   '{"location":"Monaco","start_date":"2026-09-25","end_date":"2026-09-28","party_size":2,"details":"Three days over the historic Grand Prix weekend. First choice a 992 GT3 in manual, second a Ferrari 296 GTB. Delivered to the hotel, insurance handled."}'::jsonb,
   9000, 14000, 'quoted', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.quotes (id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes) values
  ('bbbbbbb1-0000-4000-8000-000000000001',
   'aaaaaaa2-0000-4000-8000-000000000001',
   214500.00, 1430.000000000, 214500.000000,
   now() + interval '5 days',
   'M/Y Aurelia, 38m Sanlorenzo, 2023 refit. Seven nights ex-Positano. Includes captain and five crew, chef, fuel to 200nm, tender and toys, harbour fees. VAT and gratuity excluded. Provisioning billed at cost after the charter.'),

  ('bbbbbbb1-0000-4000-8000-000000000002',
   'aaaaaaa2-0000-4000-8000-000000000002',
   11800.00, 78.666666667, 11800.000000,
   now() + interval '3 days',
   '992 GT3 in Shark Blue, six-speed manual, 1,200km allowance. Hotel delivery Thursday 09:00, collection Sunday 18:00. Fully insured with a $15,000 excess held against the card on file, released on return.')
on conflict (id) do nothing;

-- --- quoted (quote already expired: exercises the expiry path) --------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa2-0000-4000-8000-000000000003',
   '33333333-3333-4333-8333-333333333333',
   'events',
   '{"location":"London, SW19","start_date":"2026-07-11","party_size":4,"details":"Centre Court, semi-final day. Four seats together in the first fifteen rows if they exist at any price. Debenture seats acceptable."}'::jsonb,
   40000, 75000, 'quoted', now() - interval '30 days')
on conflict (id) do nothing;

insert into public.quotes (id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes) values
  ('bbbbbbb1-0000-4000-8000-000000000003',
   'aaaaaaa2-0000-4000-8000-000000000003',
   62000.00, 413.333333333, 62000.000000,
   now() - interval '21 days',
   'Four debenture seats, Centre Court, row 9. Includes Debenture Holders Lounge access and parking. Held for 48 hours only, the resale desk will not extend.')
on conflict (id) do nothing;

-- --- paid ------------------------------------------------------------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa3-0000-4000-8000-000000000001',
   '22222222-2222-4222-8222-222222222222',
   'villas',
   '{"location":"Mykonos, Agios Lazaros","start_date":"2026-08-01","end_date":"2026-08-08","party_size":10,"details":"Seven nights. Five bedrooms minimum, infinity pool facing the sunset, staffed. Two of the party are vegan and one has a severe shellfish allergy."}'::jsonb,
   90000, 130000, 'paid', now() - interval '12 days')
on conflict (id) do nothing;

insert into public.quotes (id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes) values
  ('bbbbbbb2-0000-4000-8000-000000000001',
   'aaaaaaa3-0000-4000-8000-000000000001',
   118000.00, 786.666666667, 118000.000000,
   now() - interval '5 days',
   'Villa Thalassa, six bedrooms, Agios Lazaros. Seven nights with house manager, chef, daily housekeeping, driver on call 08:00 to 00:00. Breakage deposit of $10,000 refundable within seven days of departure.')
on conflict (id) do nothing;

insert into public.payment_intents (id, request_id, quote_id, token, amount, amount_usd, sol_price_usd, recipient, mint, status, expires_at, created_at) values
  ('ccccccc1-0000-4000-8000-000000000001',
   'aaaaaaa3-0000-4000-8000-000000000001',
   'bbbbbbb2-0000-4000-8000-000000000001',
   'USDC', 118000.000000, 118000.00, null,
   'SoLcierGeTreasury11111111111111111111111111',
   '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
   'consumed', now() - interval '5 days' + interval '10 minutes', now() - interval '5 days')
on conflict (id) do nothing;

insert into public.payments (id, request_id, intent_id, tx_signature, token, amount, payer, slot, confirmed_at) values
  ('ddddddd1-0000-4000-8000-000000000001',
   'aaaaaaa3-0000-4000-8000-000000000001',
   'ccccccc1-0000-4000-8000-000000000001',
   'vUkXRmuDKxGCCFJra9uxWMdMooPEmJk3qp7Tg1ZXLspartwQUuGWdydvyicgYwZxH8gX43iy3xtBWJsBKiVbcQ1t',
   'USDC', 118000.000000,
   'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd',
   298440112, now() - interval '5 days')
on conflict (id) do nothing;

-- --- fulfilled (paid in SOL) -----------------------------------------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa4-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111',
   'jets',
   '{"origin":"Teterboro (TEB)","destination":"Aspen (ASE)","start_date":"2026-02-13","end_date":"2026-02-16","party_size":4,"details":"Valentine weekend. Skis for four, one dog in cabin (12kg, crate trained). Aspen slot times are tight so build in the buffer."}'::jsonb,
   45000, 65000, 'fulfilled', now() - interval '5 months')
on conflict (id) do nothing;

insert into public.quotes (id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes) values
  ('bbbbbbb3-0000-4000-8000-000000000001',
   'aaaaaaa4-0000-4000-8000-000000000001',
   58400.00, 389.333333333, 58400.000000,
   now() - interval '5 months' + interval '3 days',
   'Challenger 350, round trip TEB to ASE with the aircraft on the ground for the weekend. Pet approved in cabin. Includes de-icing allowance, ASE slot fees and SUV transfers both ends.')
on conflict (id) do nothing;

insert into public.payment_intents (id, request_id, quote_id, token, amount, amount_usd, sol_price_usd, recipient, mint, status, expires_at, created_at) values
  ('ccccccc2-0000-4000-8000-000000000001',
   'aaaaaaa4-0000-4000-8000-000000000001',
   'bbbbbbb3-0000-4000-8000-000000000001',
   'SOL', 389.333333333, 58400.00, 150.0000,
   'SoLcierGeTreasury11111111111111111111111111',
   null,
   'consumed', now() - interval '5 months' + interval '10 minutes', now() - interval '5 months')
on conflict (id) do nothing;

insert into public.payments (id, request_id, intent_id, tx_signature, token, amount, payer, slot, confirmed_at) values
  ('ddddddd2-0000-4000-8000-000000000001',
   'aaaaaaa4-0000-4000-8000-000000000001',
   'ccccccc2-0000-4000-8000-000000000001',
   'nSLfRuktmHeMa2cQwrwyL5ThpobjB2BYe8ZV6ZcGeeXggbHYLxinjmaMGP4mC5awXjJBwgQmTRTK3N3nXFUUbcGT',
   'SOL', 389.333333333,
   '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
   271004993, now() - interval '5 months')
on conflict (id) do nothing;

-- --- cancelled -------------------------------------------------------------

insert into public.booking_requests (id, user_id, category, details, budget_min, budget_max, status, created_at) values
  ('aaaaaaa5-0000-4000-8000-000000000001',
   '44444444-4444-4444-8444-444444444444',
   'events',
   '{"location":"Miami","start_date":"2026-05-03","end_date":"2026-05-05","party_size":6,"details":"Paddock Club for six, Formula 1 weekend. Wanted a garage tour on the Saturday."}'::jsonb,
   55000, 80000, 'cancelled', now() - interval '3 months')
on conflict (id) do nothing;

-- --- an open rate lock that has already expired ----------------------------
-- Attached to the live yacht quote so the pay panel can be seen recovering from
-- a stale lock rather than only ever seeing a fresh one.

insert into public.payment_intents (id, request_id, quote_id, token, amount, amount_usd, sol_price_usd, recipient, mint, status, expires_at, created_at) values
  ('ccccccc3-0000-4000-8000-000000000001',
   'aaaaaaa2-0000-4000-8000-000000000001',
   'bbbbbbb1-0000-4000-8000-000000000001',
   'SOL', 1430.000000000, 214500.00, 150.0000,
   'SoLcierGeTreasury11111111111111111111111111',
   null,
   'expired', now() - interval '2 hours', now() - interval '2 hours' - interval '10 minutes')
on conflict (id) do nothing;
