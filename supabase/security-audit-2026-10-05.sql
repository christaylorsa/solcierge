-- ===========================================================================
-- Security audit database changes (2026-10-05). Also folded into schema.sql.
-- Paste into the Supabase SQL editor and press Run. Safe to run more than once.
-- ===========================================================================

-- SA-12: one live rate lock per request. Older duplicates are expired first so
-- the index can be built on existing data.
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

-- SA-02: erasure also strips the contact name and email typed into a request.
create or replace function public.anonymize_user(target uuid)
returns void language plpgsql as $$
begin
  update public.users
     set name = null, email = null, wallet_address = null, anonymized_at = now()
   where id = target;

  update public.booking_requests
     set details = details - 'details' - 'contact_name' - 'contact_email'
   where user_id = target;
end $$;

revoke all on function public.anonymize_user(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user(uuid) to service_role;
