-- ===========================================================================
-- Solcierge Experiences (2026-10-07)
-- Run once in the Supabase SQL editor BEFORE deploying the matching build.
-- Safe to re-run. Also folded into schema.sql.
-- ===========================================================================

-- Experience requests get their own category, so the desk can filter them and
-- spend tiers count them like any other booking. Which experience was asked for
-- lives in booking_requests.details->>'experience'.
alter type request_category add value if not exists 'experiences';
