-- ============================================================
-- Minimal Tech Store - Supabase schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (extends Supabase auth.users with a role)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text not null default 'accessories',
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SALES (feeds the predictive dashboard chart)
-- ------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  quantity integer not null check (quantity > 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_created_at on public.sales (created_at);

-- ------------------------------------------------------------
-- CHAT MESSAGES (customer support / AI assistant log)
-- ------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  ai_response text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at trigger for products
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.chat_messages enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Profiles: users can read/update their own profile; admins can read all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Products: anyone (incl. anonymous) can read active products; only admins can write
create policy "products_public_read" on public.products
  for select using (is_active = true or public.is_admin());
create policy "products_admin_write" on public.products
  for insert with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update using (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- Sales: customers can insert/read their own sales; admins can read/write all
create policy "sales_customer_insert" on public.sales
  for insert with check (auth.uid() = customer_id or public.is_admin());
create policy "sales_read_own_or_admin" on public.sales
  for select using (auth.uid() = customer_id or public.is_admin());
create policy "sales_admin_write" on public.sales
  for update using (public.is_admin());

-- Chat messages: users manage their own thread; admins can read all
create policy "chat_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy "chat_read_own_or_admin" on public.chat_messages
  for select using (auth.uid() = user_id or public.is_admin());

-- ------------------------------------------------------------
-- SEED DATA (sample products so the storefront isn't empty)
-- ------------------------------------------------------------
insert into public.products (name, description, category, price, stock, image_url)
values
  ('Minimalist USB-C Hub', 'Aluminum 7-in-1 hub with HDMI, USB-A and SD card reader.', 'accessories', 39.90, 120, null),
  ('Wireless Ergonomic Mouse', 'Silent-click wireless mouse with a matte-black finish.', 'accessories', 29.90, 200, null),
  ('Compact Mechanical Keyboard', '65% hot-swappable mechanical keyboard, low-profile keycaps.', 'accessories', 89.90, 60, null),
  ('MagSafe Phone Stand', 'Foldable aluminum stand compatible with MagSafe chargers.', 'accessories', 24.90, 150, null),
  ('Braided USB-C Cable (2m)', 'Durable braided cable, 100W fast charging.', 'accessories', 14.90, 300, null)
on conflict do nothing;
