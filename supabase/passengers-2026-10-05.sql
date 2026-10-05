-- ===========================================================================
-- Passenger details for flights (2026-10-05)
--
-- Run this once in the Supabase SQL editor BEFORE deploying the code that uses
-- it. Safe to re-run. The same statements are folded into schema.sql.
-- ===========================================================================

-- One manifest per booking. The passengers (name, date of birth, nationality,
-- passport number and expiry) are encrypted by the app with AES-256-GCM before
-- they reach the database, so this table only ever holds ciphertext.
create table if not exists public.booking_manifests (
  request_id        uuid primary key references public.booking_requests (id) on delete cascade,
  passengers_sealed text not null,
  passenger_count   int not null check (passenger_count between 1 and 20),
  -- 30 days after the last travel date. Deleted by the job below.
  purge_after       timestamptz not null,
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists booking_manifests_purge_idx on public.booking_manifests (purge_after);

alter table public.booking_manifests enable row level security;
revoke all on public.booking_manifests from anon, authenticated;
grant all on public.booking_manifests to service_role;

-- Daily purge of manifests past their date. The app also purges whenever the desk
-- loads them, so a project without pg_cron still never shows expired data.
do $outer$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'purge-passenger-manifests',
    '17 3 * * *',
    $job$delete from public.booking_manifests where purge_after < now()$job$
  );
exception when others then
  raise notice 'pg_cron is not available (%), relying on the app-side purge', sqlerrm;
end
$outer$;

-- Erasure removes a member's manifests outright.
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

  delete from public.booking_manifests
   where request_id in (select id from public.booking_requests where user_id = target);
end $$;

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
