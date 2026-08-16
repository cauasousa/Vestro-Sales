-- ============================================================
-- Incremental migration: calendar_events
--
-- Lets the admin record multiple named events on the same date (e.g. an
-- Instagram campaign and an email blast both on Aug 20), separate from the
-- single has_event boolean on calendar_context. Standalone, idempotent, safe
-- to re-run — same convention as the other migration_*.sql files.
-- ============================================================

create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_date on public.calendar_events (date);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_admin_read" on public.calendar_events;
create policy "calendar_events_admin_read" on public.calendar_events
  for select using (public.is_admin());

drop policy if exists "calendar_events_admin_write" on public.calendar_events;
create policy "calendar_events_admin_write" on public.calendar_events
  for all using (public.is_admin()) with check (public.is_admin());
