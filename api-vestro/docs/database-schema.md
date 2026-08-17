# Database Schema — Vestro Sales (Supabase)

Reference for every table backing the API — columns, relationships, RLS policies, and the full runnable SQL (§2). Reflects the schema as currently deployed; incremental changes since the initial version ship as standalone files in `import_data/migration_*.sql`, called out inline below where relevant.

## 1. Tables

### 1.1 `profiles`
Extends Supabase Auth's `auth.users` with the application's `role`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `email` | `text` not null | |
| `full_name` | `text` | |
| `role` | `text` not null default `'customer'` | check `in ('admin','customer')` |
| `accepts_marketing` | `boolean` not null default `false` | Marketing/event email consent, captured by the checkbox on `POST /api/auth/register`. `handle_new_user` always inserts `false`; `register()` issues a follow-up `update` only when the checkbox was checked (nothing to do for `false`, it's already the default). |
| `created_at` | `timestamptz` default `now()` | |

Populated automatically by the `handle_new_user` trigger on every signup. Used by: `GET /api/auth/me`, `GET /api/users`, admin checks on every protected route, and `GET /api/marketing/opted-in-count` / `POST /api/marketing/send` (filtered on `accepts_marketing = true`). Incremental SQL: `docs/migration_marketing_email.sql`.

### 1.2 `products`
Backs `Product` (`src/types/product.ts`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `name` | `text` not null | |
| `description` | `text` | |
| `category` | `text` not null default `'accessories'` | see constraint below — matches the frontend's `ProductCategory` |
| `price` | `numeric(10,2)` not null | check `>= 0` |
| `stock` | `integer` not null default `0` | check `>= 0` |
| `image_url` | `text` | |
| `is_active` | `boolean` not null default `true` | |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` kept current by the `set_updated_at` trigger |

Used by every `/api/products*` route. Responses from `GET /api/products` and `GET /api/products/{id}` also include `discount_percent` and `discounted_price` (not persisted — computed on the fly from `discounts`, §1.10) — `null` when no discount is active for the product.

### 1.3 `orders`
The order itself — header with shipping details and status. Backs `Order['customer']` (`src/types/cart.ts`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `customer_id` | `uuid` references `profiles(id)` on delete set null | **nullable** — checkout doesn't require login today (guest checkout) |
| `full_name` | `text` not null | |
| `email` | `text` not null | |
| `address` | `text` not null | |
| `city` | `text` not null | |
| `postal_code` | `text` not null | |
| `subtotal` | `numeric(10,2)` not null | check `>= 0` |
| `status` | `text` not null default `'placed'` | check `in ('placed','paid','shipped','delivered','cancelled')` |
| `created_at` | `timestamptz` default `now()` | |

Used by `POST /api/orders`, `GET /api/orders/:id`, `GET /api/orders`.

### 1.4 `order_items`
The line items of an order. Backs `CartItem` (`src/types/cart.ts`) — stores `name`/`price` as a **snapshot** at purchase time (doesn't reference the product's current price, which may change later).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `order_id` | `uuid` references `orders(id)` on delete cascade | |
| `product_id` | `uuid` references `products(id)` on delete set null | |
| `name` | `text` not null | name snapshot |
| `price` | `numeric(10,2)` not null | price snapshot **with any discount already applied** (the price actually charged), check `>= 0` |
| `original_price` | `numeric(10,2)` | Pre-discount price snapshot, only populated when a discount was active for the product at purchase time; null = no discount |
| `quantity` | `integer` not null | check `> 0` |

`price`/`original_price` are recomputed server-side from the product plus any active discounts inside `create_order` (`app/services/orders.py::_resolve_item_price`) — the price the client sends in `POST /api/orders` is never used directly for the charged amount, only as a fallback if the product was removed between cart and checkout.

### 1.5 `sales` (derived)
Revenue ledger used only for the forecast chart (`SalesForecastPoint`, `GET /api/sales/forecast`). Has an FK to `orders` and is populated **automatically** by a trigger on every `order_items` insert — no route writes to it directly.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `order_id` | `uuid` references `orders(id)` on delete cascade | |
| `product_id` | `uuid` references `products(id)` on delete set null | |
| `customer_id` | `uuid` references `profiles(id)` on delete set null | |
| `quantity` | `integer` not null | check `> 0` |
| `total_amount` | `numeric(10,2)` not null | check `>= 0` |
| `created_at` | `timestamptz` default `now()` | |

### 1.6 `conversations`
One support thread per customer. Backs `Conversation` (`src/lib/chat-store.ts`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `customer_id` | `uuid` references `profiles(id)` on delete cascade | |
| `customer_name` | `text` not null | snapshot, avoids a join just to show the name in the list |
| `created_at` | `timestamptz` default `now()` | |

Used by `GET /api/chat/conversations`, `GET /api/chat/conversations/:customerId`. The `id` is exposed in the backend's `Conversation` schema (previously only `customerId`) — needed for the frontend to subscribe to `chat_messages` via Supabase Realtime, filtered by `conversation_id`.

### 1.7 `chat_messages`
Messages within a conversation. Replaces an earlier version (1 question + 1 `ai_response`). Backs `ChatMessage` (`src/lib/chat-store.ts`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `conversation_id` | `uuid` references `conversations(id)` on delete cascade | |
| `sender` | `text` not null | check `in ('admin','customer')` |
| `text` | `text` not null | |
| `order_id` | `uuid` references `orders(id)` on delete set null | Optional, set when the message originates from the "Contact us about this order" button; rendered as a clickable chip for both admin and customer. No RLS policy of its own — covered by `chat_messages`'s existing policies. |
| `created_at` | `timestamptz` default `now()` | |

Used by `POST /api/chat/conversations/:customerId/messages`. The existing RLS policies (owner-or-admin) are already sufficient for Supabase Realtime — the frontend authenticates with the user's JWT before subscribing to the channel, so Realtime enforces the same policies as REST reads.

Incremental SQL: `docs/migration_chat_order_link.sql` (same idempotent pattern as `migration_discounts_and_reports.sql` — `add column if not exists`, no need to re-run all of `## 2`).

**Easy-to-miss, separate gotcha:** RLS alone isn't enough for `postgres_changes` to fire — the table also needs to be in the `supabase_realtime` publication (Database > Replication in the Supabase dashboard, or `alter publication supabase_realtime add table public.chat_messages`). Without this the channel connects normally (`status: SUBSCRIBED`) but silently never receives an event — no error anywhere. Incremental SQL: `import_data/migration_realtime_chat.sql`.

### 1.7.1 `chat_reports`
A customer reporting a conversation (the "Report" button in chat). One row per report — a conversation can have more than one if the customer reports again.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `conversation_id` | `uuid` references `conversations(id)` on delete cascade | |
| `reason` | `text` | optional free text |
| `created_at` | `timestamptz` default `now()` | |

Used by `POST /api/chat/conversations/:customerId/report`. The admin sees a "Reported" badge in the conversation list (`Conversation.reported`, computed from any existing row for that `conversation_id`).

### 1.8 `newsletter_subscribers`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `email` | `text` not null unique | |
| `subscribed_at` | `timestamptz` default `now()` | |
| `unsubscribed_at` | `timestamptz` | null = still subscribed |

Used by `POST /api/newsletter/subscribe`.

### 1.9 `calendar_context`
Per-day context (holidays, events, planned promotions, paydays) used as a feature by the LightGBM-based forecast (`GET /api/sales/forecast-ml`, see `app/ml/forecaster.py`). With no row for a given date, the service falls back to neutral defaults (no holiday/event/discount) — see [`docs/machine-learning.md`](machine-learning.md).

| Column | Type | Notes |
|---|---|---|
| `date` | `date` PK | |
| `is_payday` | `boolean` not null default `false` | |
| `is_end_of_month` | `boolean` not null default `false` | |
| `days_until_holiday` | `integer` not null default `99` | days until the next registered holiday |
| `discount_rate` | `numeric(4,3)` not null default `0` | check `0..1`, a promotion planned for that day |
| `is_holiday` | `boolean` not null default `false` | |
| `has_event` | `boolean` not null default `false` | a one-off event (e.g. Black Friday) |
| `created_at` | `timestamptz` default `now()` | |

Read by `GET /api/sales/forecast-ml`. Bulk-populated by `import_data/09_calendar_context.sql`, and maintained day by day via `GET|POST /api/sales/calendar-context` / `DELETE /api/sales/calendar-context/{date}` (admin-only) — `POST` only accepts `date`/`discount_rate`/`has_event` as input; the remaining columns are derived from the date by `app/ml/calendar.py::derive_calendar_fields` (see [`docs/machine-learning.md`](machine-learning.md)).

Important: `calendar_context.discount_rate` is a **forecast context signal**, not a real discount applied to products — that's the separate `discounts` table (§1.10) below. The two aren't automatically linked today.

### 1.10 `discounts`
Real discounts that change a product's displayed/charged price — not to be confused with `calendar_context.discount_rate` (§1.9), which only feeds the forecast. Backs the admin `Discount` type and the `discount_percent`/`discounted_price` fields on `Product`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `scope` | `text` not null | check `in ('all','category','product')` |
| `category` | `text` | required (and only allowed) when `scope = 'category'` |
| `product_id` | `uuid` references `products(id)` on delete cascade | required (and only allowed) when `scope = 'product'` |
| `percentage` | `numeric(5,2)` not null | check `> 0 and <= 100` |
| `start_date` | `date` not null | |
| `end_date` | `date` | null = a single-day discount (only valid on `start_date`) |
| `created_at` | `timestamptz` default `now()` | |

Resolving a product's effective discount (`app/services/discounts.py::resolve_discount_for_product`): the most specific wins — `product` > `category` > `all`; ties at the same specificity resolve to the higher percentage. `GET|POST /api/products*` (public reads) and `create_order` compute this on every request from all discounts active on the current date — no caching, the table is small and admin-curated.

Used by `GET|POST /api/discounts`, `DELETE /api/discounts/{id}` (admin-only) — plain CRUD, the resolution logic lives in the consumers (products and orders), not here.

**If your database already has the base schema applied** (profiles/products/orders/etc already exist), don't re-run the `## 2. Full SQL` block below just to pick up `discounts`/`chat_reports`/`order_items.original_price` — Postgres's `create policy` has no `IF NOT EXISTS`, so the whole `## 2` block fails and rolls back at the first policy that already exists (e.g. `profiles_select_own_or_admin`), before reaching the new tables. Use `docs/migration_discounts_and_reports.sql` instead — just the three new pieces, genuinely idempotent (`drop policy if exists` before each `create policy`).

### 1.11 `calendar_events`
Named events on a date — different from `calendar_context.has_event` (§1.9), which is just a boolean with no identity. A date can have **multiple** events (e.g. "Instagram Campaign" and "Email blast" on the same day); `calendar_context` still holds at most one row per date.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `date` | `date` not null | no FK to `calendar_context` — the context row may not exist yet for that date |
| `name` | `text` not null | e.g. "Instagram Campaign" |
| `description` | `text` | optional |
| `created_at` | `timestamptz` default `now()` | |

`app/services/calendar_events.py::create_event` inserts the event and **ensures** `calendar_context.has_event = true` for that date (upsert, preserving the existing `discount_rate`) — so the LightGBM forecast already sees the event on the next `GET /api/sales/forecast-ml`. It's **one-directional**: deleting all events for a date doesn't automatically flip `has_event` back to `false` (a single boolean can't tell whether it was set by an event or directly by the admin via `POST /api/sales/calendar-context`) — to unset it, edit the date directly in the Planning calendar.

Used by `GET|POST /api/sales/calendar-events`, `DELETE /api/sales/calendar-events/{id}` (admin-only). Incremental SQL: `docs/migration_calendar_events.sql`.

---

## 2. Full SQL (run in the Supabase SQL Editor)

Creates the entire schema from scratch — tables, triggers, RLS, and an initial product seed.

```sql
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
  original_price numeric(10, 2) check (original_price >= 0),
  quantity integer not null check (quantity > 0)
);

-- Safe on an existing table too — `create table if not exists` above won't add
-- this column to a table that already exists from before discounts shipped.
alter table public.order_items add column if not exists original_price numeric(10, 2) check (original_price >= 0);

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

create table if not exists public.chat_reports (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_reports_conversation_id on public.chat_reports (conversation_id);

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
-- CALENDAR CONTEXT (feeds the LightGBM sales forecast)
-- ------------------------------------------------------------
create table if not exists public.calendar_context (
  date date primary key,
  is_payday boolean not null default false,
  is_end_of_month boolean not null default false,
  days_until_holiday integer not null default 99,
  discount_rate numeric(4, 3) not null default 0 check (discount_rate >= 0 and discount_rate <= 1),
  is_holiday boolean not null default false,
  has_event boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- DISCOUNTS (real product/category/store-wide price discounts)
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
alter table public.calendar_context enable row level security;
alter table public.chat_reports enable row level security;
alter table public.discounts enable row level security;

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

-- Chat reports: customer can report their own conversation, only admin can list reports
create policy "chat_reports_insert_via_conversation" on public.chat_reports
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.customer_id = auth.uid() or public.is_admin())
    )
  );
create policy "chat_reports_admin_read" on public.chat_reports
  for select using (public.is_admin());

-- Newsletter: anyone can subscribe, only admin can list subscribers
create policy "newsletter_public_insert" on public.newsletter_subscribers
  for insert with check (true);
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.is_admin());

-- Calendar context: admin-only in both directions (feeds the forecast, no public read)
create policy "calendar_context_admin_read" on public.calendar_context
  for select using (public.is_admin());
create policy "calendar_context_admin_write" on public.calendar_context
  for all using (public.is_admin()) with check (public.is_admin());

-- Discounts: admin-only in both directions — resolved server-side (service-role,
-- bypasses RLS) into discount_percent/discounted_price on GET /api/products*, so
-- there's no need for public read access to this table directly.
create policy "discounts_admin_read" on public.discounts
  for select using (public.is_admin());
create policy "discounts_admin_write" on public.discounts
  for all using (public.is_admin()) with check (public.is_admin());

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
```
