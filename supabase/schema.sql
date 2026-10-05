-- ===========================================================================
-- Solcierge schema
-- Run in the Supabase SQL editor, or: supabase db execute -f supabase/schema.sql
-- Safe to re-run.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- enums -----------------------------------------------------------------

do $$ begin
  create type request_status as enum ('pending', 'quoted', 'paid', 'fulfilled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_token as enum ('SOL', 'USDC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_category as enum ('jets', 'yachts', 'villas', 'cars', 'dining', 'events', 'bespoke');
exception when duplicate_object then null; end $$;

do $$ begin
  create type intent_status as enum ('open', 'expired', 'consumed');
exception when duplicate_object then null; end $$;

-- --- users -----------------------------------------------------------------
-- A member is identified by wallet address. Email is the fallback identity for
-- members who sign in with a magic link instead of a wallet; both may be set
-- once a member links the two.

create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text unique,
  email          text unique,
  name           text,
  created_at     timestamptz not null default now(),
  -- Set by anonymize_user(). An anonymised member keeps their id, so their
  -- bookings and payments stay intact for the records we must retain.
  anonymized_at  timestamptz,
  constraint users_identity_present check (
    wallet_address is not null or email is not null or anonymized_at is not null
  )
);

-- --- booking_requests ------------------------------------------------------

create table if not exists public.booking_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete restrict,
  category   request_category not null,
  details    jsonb not null default '{}'::jsonb,
  budget_min numeric(14, 2),
  budget_max numeric(14, 2),
  status     request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_range_ordered check (
    budget_min is null or budget_max is null or budget_max >= budget_min
  )
);

create index if not exists booking_requests_user_idx on public.booking_requests (user_id, created_at desc);
create index if not exists booking_requests_status_idx on public.booking_requests (status, created_at desc);

-- --- quotes ----------------------------------------------------------------
-- amount_usd is the source of truth. amount_sol / amount_usdc are the operator's
-- indicative figures at quote time; the binding SOL figure is re-derived at
-- pay-time into payment_intents against a live feed.

create table if not exists public.quotes (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.booking_requests (id) on delete cascade,
  amount_usd   numeric(14, 2) not null check (amount_usd > 0),
  amount_sol   numeric(20, 9),
  amount_usdc  numeric(14, 6),
  expires_at   timestamptz not null,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists quotes_request_idx on public.quotes (request_id, created_at desc);

-- --- payment_intents -------------------------------------------------------
-- The 10-minute rate lock. Created when a member opens the pay panel: it pins
-- the exact on-chain amount the server will accept, so verification never has
-- to trust a number supplied by the client.

create table if not exists public.payment_intents (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.booking_requests (id) on delete cascade,
  quote_id      uuid not null references public.quotes (id) on delete cascade,
  token         payment_token not null,
  amount        numeric(20, 9) not null check (amount > 0),
  amount_usd    numeric(14, 2) not null,
  sol_price_usd numeric(14, 4),
  recipient     text not null,
  mint          text,
  status        intent_status not null default 'open',
  expires_at    timestamptz not null,
  -- Which version of the legal pages the member accepted, and when. Evidence of
  -- the contract: the pay panel will not lock a rate until the terms are accepted.
  terms_version     text,
  terms_accepted_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Existing databases created before the acceptance columns.
alter table public.payment_intents add column if not exists terms_version text;
alter table public.payment_intents add column if not exists terms_accepted_at timestamptz;

create index if not exists payment_intents_request_idx on public.payment_intents (request_id, created_at desc);

-- One live rate lock per request, so two concurrent locks cannot both stay open.
-- Older duplicates are expired first so the index can be built on existing data.
update public.payment_intents p
   set status = 'expired'
 where p.status = 'open'
   and exists (
     select 1 from public.payment_intents q
      where q.request_id = p.request_id
        and q.status = 'open'
        and (q.created_at, q.id) > (p.created_at, p.id)
   );
create unique index if not exists payment_intents_one_open_per_request
  on public.payment_intents (request_id) where status = 'open';

-- --- payments --------------------------------------------------------------
-- One confirmed on-chain transfer. tx_signature is unique: that constraint is
-- what makes replaying a signature against a second request impossible.

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.booking_requests (id) on delete restrict,
  intent_id    uuid references public.payment_intents (id) on delete set null,
  tx_signature text not null unique,
  token        payment_token not null,
  amount       numeric(20, 9) not null,
  payer        text,
  slot         bigint,
  confirmed_at timestamptz not null default now()
);

create index if not exists payments_request_idx on public.payments (request_id);

-- --- paperwork on a booking ---------------------------------------------------
-- What the desk hands the member once a booking is confirmed: the supplier's
-- reference, the itinerary and instructions, and the documents themselves.

alter table public.booking_requests add column if not exists confirmation_ref text;
alter table public.booking_requests add column if not exists itinerary text;

create table if not exists public.booking_documents (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.booking_requests (id) on delete restrict,
  title        text not null,
  file_name    text not null,
  storage_path text not null unique,
  content_type text not null,
  size_bytes   bigint not null,
  created_at   timestamptz not null default now()
);

create index if not exists booking_documents_request_idx
  on public.booking_documents (request_id, created_at);

alter table public.booking_documents enable row level security;
revoke all on public.booking_documents from anon, authenticated;
grant all on public.booking_documents to service_role;

-- The files. Private: no storage policies exist, so only the service role can read
-- or write. Members download through /api/documents/<id>, which checks ownership
-- and hands out a 60-second signed link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-documents',
  'booking-documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/calendar',
    'application/vnd.apple.pkpass'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --- member Telegram ----------------------------------------------------------
-- A member links a Telegram chat by opening t.me/<bot>?start=<code>. The code is
-- single-use and short-lived; the webhook swaps it for the chat id.

alter table public.users add column if not exists telegram_chat_id bigint;
alter table public.users add column if not exists telegram_linked_at timestamptz;
alter table public.users add column if not exists telegram_link_code text;
alter table public.users add column if not exists telegram_link_expires_at timestamptz;

create unique index if not exists users_telegram_link_code_key
  on public.users (telegram_link_code) where telegram_link_code is not null;
create index if not exists users_telegram_chat_idx
  on public.users (telegram_chat_id) where telegram_chat_id is not null;

-- --- updated_at ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists booking_requests_touch on public.booking_requests;
create trigger booking_requests_touch
  before update on public.booking_requests
  for each row execute function public.touch_updated_at();

-- --- row level security ----------------------------------------------------
-- Wallet identity is not a Supabase Auth identity, so PostgREST cannot express
-- "this row belongs to the connected wallet". Instead: RLS on, zero policies for
-- anon/authenticated, and every read and write goes through a Next.js route
-- handler holding the service role key, which enforces ownership in code.
-- The anon key therefore grants no data access even if it leaks.

alter table public.users            enable row level security;
alter table public.booking_requests enable row level security;
alter table public.quotes           enable row level security;
alter table public.payment_intents  enable row level security;
alter table public.payments         enable row level security;

revoke all on public.users, public.booking_requests, public.quotes,
              public.payment_intents, public.payments, public.booking_documents
  from anon, authenticated;

-- Newer Supabase projects can be created without default table grants, so the
-- service role gets its access explicitly rather than by project setting.
grant usage on schema public to service_role;
grant all on public.users, public.booking_requests, public.quotes,
             public.payment_intents, public.payments, public.booking_documents
  to service_role;

-- --- retention and erasure -------------------------------------------------
-- Payment records must be kept for tax and AML purposes (typically 6 to 7
-- years) even when a member asks to be forgotten. So deleting a member, or a
-- booking that has payments, is refused, and erasure is done by anonymising:
--
--   select public.anonymize_user('<user id>');
--
-- That clears the member's name, email, wallet and Telegram link and strips the
-- free-text brief and typed contact details from their requests, while bookings,
-- quotes and payments remain. Uploaded documents are not touched: Postgres cannot
-- delete Storage files, so remove the booking's folder in the Storage dashboard.

alter table public.users add column if not exists anonymized_at timestamptz;
alter table public.users drop constraint if exists users_identity_present;
alter table public.users add constraint users_identity_present check (
  wallet_address is not null or email is not null or anonymized_at is not null
);

alter table public.booking_requests drop constraint if exists booking_requests_user_id_fkey;
alter table public.booking_requests add constraint booking_requests_user_id_fkey
  foreign key (user_id) references public.users (id) on delete restrict;

alter table public.payments drop constraint if exists payments_request_id_fkey;
alter table public.payments add constraint payments_request_id_fkey
  foreign key (request_id) references public.booking_requests (id) on delete restrict;

create or replace function public.anonymize_user(target uuid)
returns void language plpgsql as $$
begin
  update public.users
     set name = null, email = null, wallet_address = null,
         telegram_chat_id = null, telegram_linked_at = null,
         telegram_link_code = null, telegram_link_expires_at = null,
         anonymized_at = now()
   where id = target;

  -- The free-text brief, plus the contact name and email a member typed into it
  -- (kept on the request rather than the users row, see SA-02 in SECURITY-AUDIT.md).
  update public.booking_requests
     set details = details - 'details' - 'contact_name' - 'contact_email'
   where user_id = target;
end $$;

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
