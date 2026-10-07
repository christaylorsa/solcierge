-- ===========================================================================
-- Tiers, X connect and referrals (2026-10-07)
-- Run once in the Supabase SQL editor BEFORE deploying the matching build.
-- Safe to re-run. Also folded into schema.sql.
-- ===========================================================================

-- --- connected X account -------------------------------------------------------
-- Public profile fields only. No X token is ever stored: the app reads the profile
-- once and revokes the token straight away.
alter table public.users add column if not exists x_user_id    text;
alter table public.users add column if not exists x_username   text;
alter table public.users add column if not exists x_name       text;
alter table public.users add column if not exists x_avatar_url text;
alter table public.users add column if not exists x_linked_at  timestamptz;

-- One X account belongs to one member.
create unique index if not exists users_x_user_id_key
  on public.users (x_user_id) where x_user_id is not null;

-- --- referrals -----------------------------------------------------------------
-- referral_code is stored lowercase. referred_by is set once, when the member's
-- account is created from a share link or when they type a code before their first
-- settled booking, and never changes after that.
alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referred_by   uuid references public.users (id) on delete set null;
alter table public.users add column if not exists referred_at   timestamptz;

create unique index if not exists users_referral_code_key
  on public.users (lower(referral_code)) where referral_code is not null;
create index if not exists users_referred_by_idx
  on public.users (referred_by) where referred_by is not null;

alter table public.users drop constraint if exists users_not_self_referred;
alter table public.users add constraint users_not_self_referred check (referred_by is null or referred_by <> id);

-- --- erasure -------------------------------------------------------------------
-- anonymize_user() now also clears the X link and the referral code. referred_by
-- stays, in both directions, because rewards already paid on it are financial records.
create or replace function public.anonymize_user(target uuid)
returns void language plpgsql as $$
begin
  update public.users
     set name = null, email = null, wallet_address = null,
         contact_email = null, phone = null,
         telegram_chat_id = null, telegram_linked_at = null,
         telegram_link_code = null, telegram_link_expires_at = null,
         x_user_id = null, x_username = null, x_name = null, x_avatar_url = null, x_linked_at = null,
         referral_code = null,
         anonymized_at = now()
   where id = target;

  update public.booking_requests
     set details = details - 'details' - 'contact_name' - 'contact_email'
   where user_id = target;

  delete from public.booking_manifests
   where request_id in (select id from public.booking_requests where user_id = target);
end $$;

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
