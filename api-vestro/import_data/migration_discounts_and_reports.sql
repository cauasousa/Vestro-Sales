-- ============================================================
-- Incremental migration: discounts, chat_reports, order_items.original_price
--
-- Paste this whole file into the Supabase SQL Editor and run it once — it's
-- standalone and idempotent (safe to re-run). It does NOT touch any existing
-- table or policy, so it won't hit the "policy already exists" error you get
-- from re-running the full schema block in docs/database-schema.md §2 (that
-- block uses `create policy`, which has no `IF NOT EXISTS` in Postgres — this
-- file avoids that by pairing every policy with `drop policy if exists` first).
-- ============================================================

-- ------------------------------------------------------------
-- DISCOUNTS
-- ------------------------------------------------------------
create table if not exists public.discounts (
  id uuid primary key default uuid_generate_v4(),
  scope text not null check (scope in ('all', 'category', 'product')),
  category text,
  product_id uuid references public.products(id) on delete cascade,
  percentage numeric(5, 2) not null check (percentage > 0 and percentage <= 100),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (
    (scope = 'all' and category is null and product_id is null)
    or (scope = 'category' and category is not null and product_id is null)
    or (scope = 'product' and product_id is not null and category is null)
  )
);

create index if not exists idx_discounts_scope on public.discounts (scope);

alter table public.discounts enable row level security;

drop policy if exists "discounts_admin_read" on public.discounts;
create policy "discounts_admin_read" on public.discounts
  for select using (public.is_admin());

drop policy if exists "discounts_admin_write" on public.discounts;
create policy "discounts_admin_write" on public.discounts
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- ORDER_ITEMS: snapshot of the pre-discount price
-- ------------------------------------------------------------
alter table public.order_items
  add column if not exists original_price numeric(10, 2) check (original_price >= 0);

-- ------------------------------------------------------------
-- CHAT_REPORTS
-- ------------------------------------------------------------
create table if not exists public.chat_reports (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_reports_conversation_id on public.chat_reports (conversation_id);

alter table public.chat_reports enable row level security;

drop policy if exists "chat_reports_insert_via_conversation" on public.chat_reports;
create policy "chat_reports_insert_via_conversation" on public.chat_reports
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.customer_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "chat_reports_admin_read" on public.chat_reports;
create policy "chat_reports_admin_read" on public.chat_reports
  for select using (public.is_admin());
