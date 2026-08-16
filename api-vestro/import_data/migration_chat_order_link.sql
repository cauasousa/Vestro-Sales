-- ============================================================
-- Incremental migration: chat_messages.order_id
--
-- Lets a chat message reference the order it's about (customer picks it via
-- "Contact us about this order" on /orders; admin/customer both see a
-- clickable order chip on that message). Standalone, idempotent, safe to
-- re-run — same convention as migration_discounts_and_reports.sql.
-- ============================================================

alter table public.chat_messages
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index if not exists idx_chat_messages_order_id on public.chat_messages (order_id);
