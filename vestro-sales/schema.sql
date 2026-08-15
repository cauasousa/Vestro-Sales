-- ============================================================
-- Vestro Sales - Supabase schema (v2)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

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
  category text not null default 'accessories'
    check (category in ('accessories', 'audio', 'desk', 'mobile', 'network', 'work')),
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
-- ORDERS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  status text not null default 'placed'
    check (status in ('placed', 'paid', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  image_url text
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- ------------------------------------------------------------
-- SALES (derived ledger, feeds the forecast chart)
-- ------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  quantity integer not null check (quantity > 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_created_at on public.sales (created_at);

-- auto-populate sales whenever an order_item is inserted
create or replace function public.record_sale_from_order_item()
returns trigger as $$
declare
  v_customer_id uuid;
  v_created_at timestamptz;
begin
  select customer_id, created_at into v_customer_id, v_created_at
  from public.orders where id = new.order_id;

  insert into public.sales (order_id, product_id, customer_id, quantity, total_amount, created_at)
  values (new.order_id, new.product_id, v_customer_id, new.quantity, new.price * new.quantity, v_created_at);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_order_item_to_sale on public.order_items;
create trigger trg_order_item_to_sale
  after insert on public.order_items
  for each row execute procedure public.record_sale_from_order_item();

-- ------------------------------------------------------------
-- CHAT (support conversations)
-- ------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.profiles(id) on delete cascade,
  customer_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('admin', 'customer')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation_id on public.chat_messages (conversation_id);

-- ------------------------------------------------------------
-- NEWSLETTER
-- ------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sales enable row level security;
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Products
create policy "products_public_read" on public.products
  for select using (is_active = true or public.is_admin());
create policy "products_admin_write" on public.products
  for insert with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update using (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- Orders: guest checkout allowed (customer_id null), owner or admin can read
create policy "orders_insert_own_or_guest" on public.orders
  for insert with check (customer_id is null or customer_id = auth.uid() or public.is_admin());
create policy "orders_read_own_or_admin" on public.orders
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- Order items: access follows the parent order
create policy "order_items_insert_via_order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = auth.uid() or o.customer_id is null or public.is_admin())
    )
  );
create policy "order_items_read_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin())
    )
  );

-- Sales: read-only for owner/admin, writes only happen via the trigger (security definer)
create policy "sales_read_own_or_admin" on public.sales
  for select using (auth.uid() = customer_id or public.is_admin());

-- Conversations: owner or admin
create policy "conversations_read_own_or_admin" on public.conversations
  for select using (auth.uid() = customer_id or public.is_admin());
create policy "conversations_insert_own_or_admin" on public.conversations
  for insert with check (auth.uid() = customer_id or public.is_admin());

-- Chat messages: access follows the parent conversation
create policy "chat_messages_read_via_conversation" on public.chat_messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.customer_id = auth.uid() or public.is_admin())
    )
  );
create policy "chat_messages_insert_via_conversation" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.customer_id = auth.uid() or public.is_admin())
    )
  );

-- Newsletter: anyone can subscribe, only admin can list subscribers
create policy "newsletter_public_insert" on public.newsletter_subscribers
  for insert with check (true);
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.is_admin());

-- ------------------------------------------------------------
-- SEED DATA
-- ------------------------------------------------------------
insert into public.products (name, description, category, price, stock, image_url)
values
  ('Minimalist USB-C Hub', 'Aluminum 7-in-1 hub with HDMI, USB-A and SD card reader.', 'accessories', 39.90, 120, null),
  ('Wireless Ergonomic Mouse', 'Silent-click wireless mouse with a matte-black finish.', 'accessories', 29.90, 200, null),
  ('Compact Mechanical Keyboard', '65% hot-swappable mechanical keyboard, low-profile keycaps.', 'accessories', 89.90, 60, null),
  ('MagSafe Phone Stand', 'Foldable aluminum stand compatible with MagSafe chargers.', 'accessories', 24.90, 150, null),
  ('Braided USB-C Cable (2m)', 'Durable braided cable, 100W fast charging.', 'accessories', 14.90, 300, null)
on conflict do nothing;
