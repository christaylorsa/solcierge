-- ===========================================================================
-- Paperwork and member Telegram updates (2026-10-05)
--
-- Run this once in the Supabase SQL editor BEFORE deploying the code that uses
-- it: the booking pages read these columns, so the new code fails without them.
-- Safe to re-run. The same statements are folded into schema.sql.
-- ===========================================================================

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

-- --- erasure ------------------------------------------------------------------
-- Anonymising a member now also unlinks their Telegram chat. Uploaded documents
-- are not touched here: Postgres cannot delete Storage files, so remove them in
-- the Storage dashboard (folder = the booking id) when erasing a member.

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
