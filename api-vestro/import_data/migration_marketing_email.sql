-- ============================================================
-- Incremental migration: profiles.accepts_marketing
--
-- Marketing/event email consent, captured at registration (POST
-- /api/auth/register). Standalone, idempotent, safe to re-run — same
-- convention as the other migration_*.sql files. No RLS changes needed:
-- the existing profiles policies (own-row-or-admin) already cover this
-- column, and the admin marketing-send endpoint reads it via the
-- service-role client, which bypasses RLS entirely.
-- ============================================================

alter table public.profiles
  add column if not exists accepts_marketing boolean not null default false;
