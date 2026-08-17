-- ============================================================
-- Enable Realtime for chat_messages
--
-- postgres_changes subscriptions (used by /support and /admin/chat for live
-- message delivery) only fire for tables explicitly added to the
-- `supabase_realtime` publication — this is separate from RLS and from
-- table creation, and easy to miss. Without this, the channel connects fine
-- (status SUBSCRIBED) but silently never receives INSERT events. Standalone,
-- idempotent, safe to re-run.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
