# Database Schema — Vestro Sales (Supabase)

Especificação de **todas as tabelas necessárias** para tirar o projeto do mock/localStorage, com base nas rotas listadas em `docs/api-requirements.md` e na estrutura já iniciada em `schema.sql` / `docs/database-cmd.text`. Este arquivo resolve as pendências de modelagem apontadas em `api-requirements.md §12` e traz o SQL pronto pra rodar no Supabase SQL Editor.

## 0. Decisões tomadas (resolvendo `api-requirements.md §12`)

| Pendência | Decisão |
|---|---|
| Nomes de role divergentes (`manager/client` vs `admin/customer`) | Padronizar em **`admin` \| `customer`** — é o que `schema.sql`, `database-cmd.text` e a função `is_admin()` já usam. **Ação no front**: `src/types/user.ts` (`Role`), `useAuthMock.ts` e as páginas admin usam hoje `'manager' \| 'client'` e precisam ser renomeados para bater com o banco. |
| Pedidos: só existia `sales` (1 linha por item vendido) | Criar **`orders`** (o pedido) + **`order_items`** (os itens). `sales` é mantida como ledger de receita para o gráfico de forecast, populada automaticamente por trigger a partir de `order_items` — nenhuma rota escreve nela manualmente. |
| Chat: `chat_messages` original era 1 pergunta + 1 `ai_response`, mas o admin chat implementado é uma conversa bidirecional (admin ↔ cliente) | Trocar por **`conversations`** + **`chat_messages`** (redesenhada, sem coluna `ai_response`). O AI Assistant (`/api/ai/assistant`) é stateless hoje — não persiste histórico, então não precisa de tabela própria por enquanto. |
| Newsletter (rota `POST /api/newsletter/subscribe` em `api-requirements.md §10`) não tinha tabela | Criar **`newsletter_subscribers`**. |

---

## 1. Tabelas

### 1.1 `profiles`
Estende `auth.users` do Supabase Auth com o `role` da aplicação. Já existe em `schema.sql`, mantida como está.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `email` | `text` not null | |
| `full_name` | `text` | |
| `role` | `text` not null default `'customer'` | check `in ('admin','customer')` |
| `accepts_marketing` | `boolean` not null default `false` | **novo** — consentimento pra receber email de marketing/evento, capturado no checkbox de `POST /api/auth/register`. `handle_new_user` sempre insere `false`; `register()` faz um `update` logo em seguida só quando o checkbox foi marcado (nada a fazer no caso `false`, já é o default). |
| `created_at` | `timestamptz` default `now()` | |

Populada automaticamente pelo trigger `handle_new_user` em todo signup. Usada por: `GET /api/auth/me`, `GET /api/users`, checagem de admin em todas as rotas protegidas, e `GET /api/marketing/opted-in-count` / `POST /api/marketing/send` (filtro `accepts_marketing = true`). SQL incremental: `docs/migration_marketing_email.sql`.

### 1.2 `products`
Já existe em `schema.sql`, mantida como está — cobre `Product` (`src/types/product.ts`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `name` | `text` not null | |
| `description` | `text` | |
| `category` | `text` not null default `'accessories'` | ver constraint abaixo — bate com `ProductCategory` do front |
| `price` | `numeric(10,2)` not null | check `>= 0` |
| `stock` | `integer` not null default `0` | check `>= 0` |
| `image_url` | `text` | |
| `is_active` | `boolean` not null default `true` | |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` mantido por trigger `set_updated_at` |

Usada por: todas as rotas `/api/products*` (§4 de `api-requirements.md`). As respostas de
`GET /api/products` e `GET /api/products/{id}` agora incluem `discount_percent` e
`discounted_price` (não-persistidos, calculados on-the-fly a partir de `discounts`, §1.10)
— `null` quando não há desconto ativo pro produto.

### 1.3 `orders` (nova)
O pedido em si — cabeçalho com dados de entrega e status. Cobre `Order['customer']` (`src/types/cart.ts`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `customer_id` | `uuid` references `profiles(id)` on delete set null | **nullable** — checkout hoje não exige login (guest checkout) |
| `full_name` | `text` not null | |
| `email` | `text` not null | |
| `address` | `text` not null | |
| `city` | `text` not null | |
| `postal_code` | `text` not null | |
| `subtotal` | `numeric(10,2)` not null | check `>= 0` |
| `status` | `text` not null default `'placed'` | check `in ('placed','paid','shipped','delivered','cancelled')` |
| `created_at` | `timestamptz` default `now()` | |

Usada por: `POST /api/orders`, `GET /api/orders/:id`, `GET /api/orders` (§5).

### 1.4 `order_items` (nova)
Os itens de um pedido. Cobre `CartItem` (`src/types/cart.ts`) — guarda `name`/`price` como **snapshot** no momento da compra (não referencia o preço atual do produto, que pode mudar depois).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `order_id` | `uuid` references `orders(id)` on delete cascade | |
| `product_id` | `uuid` references `products(id)` on delete set null | |
| `name` | `text` not null | snapshot do nome |
| `price` | `numeric(10,2)` not null | snapshot do preço **já com desconto aplicado** (o preço cobrado), check `>= 0` |
| `original_price` | `numeric(10,2)` | **novo** — snapshot do preço sem desconto, só preenchido quando um desconto estava ativo pro produto no momento da compra; null = sem desconto |
| `quantity` | `integer` not null | check `> 0` |

`price`/`original_price` são recalculados no backend a partir do produto + descontos ativos em `create_order` (`app/services/orders.py::_resolve_item_price`) — o preço enviado pelo cliente no `POST /api/orders` nunca é usado diretamente pro valor cobrado, só como fallback se o produto tiver sido removido entre o carrinho e o checkout.

### 1.5 `sales` (mantida, agora derivada)
Ledger de receita usado só para o gráfico de forecast (`SalesForecastPoint`, `GET /api/sales/forecast`, §7). Já existe em `schema.sql`; ganha uma FK pra `orders` e passa a ser preenchida **automaticamente** por trigger a cada `order_items` inserido — nenhuma rota grava nela direto.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `order_id` | `uuid` references `orders(id)` on delete cascade | **novo** |
| `product_id` | `uuid` references `products(id)` on delete set null | |
| `customer_id` | `uuid` references `profiles(id)` on delete set null | |
| `quantity` | `integer` not null | check `> 0` |
| `total_amount` | `numeric(10,2)` not null | check `>= 0` |
| `created_at` | `timestamptz` default `now()` | |

### 1.6 `conversations` (nova)
Uma thread de suporte por cliente. Cobre `Conversation` (`src/lib/chat-store.ts`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `customer_id` | `uuid` references `profiles(id)` on delete cascade | |
| `customer_name` | `text` not null | snapshot, evita join só pra exibir nome na lista |
| `created_at` | `timestamptz` default `now()` | |

Usada por: `GET /api/chat/conversations`, `GET /api/chat/conversations/:customerId` (§8). O
`id` agora é exposto no schema `Conversation` do backend (antes só `customerId`) — necessário
pro frontend se inscrever em `chat_messages` via Supabase Realtime filtrado por
`conversation_id` (ver `docs/miss_atribu.md`-style nota em §8 sobre real-time).

### 1.7 `chat_messages` (redesenhada)
Mensagens dentro de uma conversa. Substitui a versão antiga (1 pergunta + 1 `ai_response`). Cobre `ChatMessage` (`src/lib/chat-store.ts`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `conversation_id` | `uuid` references `conversations(id)` on delete cascade | |
| `sender` | `text` not null | check `in ('admin','customer')` |
| `text` | `text` not null | |
| `order_id` | `uuid` references `orders(id)` on delete set null | **novo** — opcional, preenchido quando a mensagem parte do botão "Contact us about this order"; renderizado como um chip clicável tanto pro admin quanto pro cliente. Sem policy de RLS própria — segue a mesma linha (RLS de `chat_messages` já cobre). |
| `created_at` | `timestamptz` default `now()` | |

Usada por: `POST /api/chat/conversations/:customerId/messages` (§8). As policies de RLS
existentes (owner-or-admin) já são suficientes pro Supabase Realtime — o frontend se
autentica com o JWT do usuário antes de assinar o channel, então o Realtime aplica as
mesmas policies que a leitura via REST.

SQL incremental: `docs/migration_chat_order_link.sql` (mesmo padrão idempotente de
`migration_discounts_and_reports.sql` — `add column if not exists`, não precisa re-rodar
o `## 2` inteiro).

**Pendência separada, fácil de esquecer:** RLS não é suficiente pra `postgres_changes`
disparar — a tabela também precisa estar na publication `supabase_realtime` (Database >
Replication no painel do Supabase, ou `alter publication supabase_realtime add table
public.chat_messages`). Sem isso o channel conecta normalmente (`status: SUBSCRIBED`) mas
nunca recebe evento nenhum, silenciosamente — não dá erro em lugar nenhum. SQL incremental:
`docs/migration_realtime_chat.sql`.

### 1.7.1 `chat_reports` (nova)
Denúncia de uma conversa pelo cliente (botão "Report" no chat). Uma linha por denúncia —
uma conversa pode ter mais de uma se o cliente reportar de novo.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `conversation_id` | `uuid` references `conversations(id)` on delete cascade | |
| `reason` | `text` | opcional, texto livre |
| `created_at` | `timestamptz` default `now()` | |

Usada por: `POST /api/chat/conversations/:customerId/report`. O admin vê um badge
"Reported" na lista de conversas (`Conversation.reported`, calculado a partir de qualquer
linha existente pra aquela `conversation_id`).

### 1.8 `newsletter_subscribers` (nova)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `email` | `text` not null unique | |
| `subscribed_at` | `timestamptz` default `now()` | |
| `unsubscribed_at` | `timestamptz` | null = ainda inscrito |

Usada por: `POST /api/newsletter/subscribe` (§10).

### 1.9 `calendar_context` (nova)
Contexto por dia (feriados, eventos, promoções planejadas, dias de pagamento) usado como
feature pelo forecast baseado em LightGBM (`GET /api/sales/forecast-ml`, ver
`app/ml/forecaster.py`). Sem linha pra uma data, o serviço usa defaults neutros (sem
feriado/evento/desconto) — ver `docs/miss_atribu.md`.

| Coluna | Tipo | Notas |
|---|---|---|
| `date` | `date` PK | |
| `is_payday` | `boolean` not null default `false` | |
| `is_end_of_month` | `boolean` not null default `false` | |
| `days_until_holiday` | `integer` not null default `99` | dias até o próximo feriado cadastrado |
| `discount_rate` | `numeric(4,3)` not null default `0` | check `0..1`, promoção planejada pra esse dia |
| `is_holiday` | `boolean` not null default `false` | |
| `has_event` | `boolean` not null default `false` | evento pontual (ex.: Black Friday) |
| `created_at` | `timestamptz` default `now()` | |

Lida por `GET /api/sales/forecast-ml`. Populada em massa por
`import_data/09_calendar_context.sql`, e dia a dia por
`GET|POST /api/sales/calendar-context` / `DELETE /api/sales/calendar-context/{date}`
(admin-only) — o `POST` só aceita `date`/`discount_rate`/`has_event` como input; as demais
colunas são calculadas a partir da data por `app/ml/calendar.py::derive_calendar_fields`
(ver `docs/miss_atribu.md` §1).

Importante: `calendar_context.discount_rate` é um **sinal de contexto pro forecast**, não
um desconto real aplicado a produtos — é uma pendência separada de `discounts` (§1.10)
abaixo. As duas coisas não são acopladas automaticamente hoje.

### 1.10 `discounts` (nova)
Descontos reais que mudam o preço exibido/cobrado de produtos — não confundir com
`calendar_context.discount_rate` (§1.9), que só alimenta o forecast. Cobre `Discount`
(admin) e os campos `discount_percent`/`discounted_price` em `Product`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `scope` | `text` not null | check `in ('all','category','product')` |
| `category` | `text` | obrigatório (e só permitido) quando `scope = 'category'` |
| `product_id` | `uuid` references `products(id)` on delete cascade | obrigatório (e só permitido) quando `scope = 'product'` |
| `percentage` | `numeric(5,2)` not null | check `> 0 and <= 100` |
| `start_date` | `date` not null | |
| `end_date` | `date` | null = desconto de um dia só (só vale em `start_date`) |
| `created_at` | `timestamptz` default `now()` | |

Resolução do desconto efetivo de um produto (`app/services/discounts.py::resolve_discount_for_product`):
mais específico vence — `product` > `category` > `all`; empate na mesma especificidade
resolve pra maior porcentagem. `GET|POST /api/products*` (leitura pública) e
`create_order` computam isso a cada request a partir de todos os descontos ativos na
data corrente — não há cache, tabela é pequena e admin-curada.

Usada por: `GET|POST /api/discounts`, `DELETE /api/discounts/{id}` (admin-only) — CRUD puro,
sem lógica de resolução aí (isso vive nos consumidores: produtos e pedidos).

**Se seu banco já tem o schema base aplicado** (profiles/products/orders/etc já existem),
não re-rode o bloco `## 2. SQL completo` abaixo pra pegar `discounts`/`chat_reports`/
`order_items.original_price` — `create policy` não tem `IF NOT EXISTS` no Postgres, então
o `## 2` inteiro falha e faz rollback no primeiro `create policy` que já existe (ex.:
`profiles_select_own_or_admin`), antes de chegar nas tabelas novas. Use
`docs/migration_discounts_and_reports.sql` em vez disso — só as três coisas novas,
idempotente de verdade (`drop policy if exists` antes de cada `create policy`).

### 1.11 `calendar_events` (nova)
Eventos nomeados numa data — diferente de `calendar_context.has_event` (§1.9), que é só
um boolean sem identidade. Uma data pode ter **vários** eventos (ex.: "Instagram
Campaign" e "Email blast" no mesmo dia 20/08); `calendar_context` continua tendo no
máximo uma linha por data.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `uuid_generate_v4()` | |
| `date` | `date` not null | sem FK pra `calendar_context` — a linha de contexto pode nem existir ainda pra essa data |
| `name` | `text` not null | ex.: "Instagram Campaign" |
| `description` | `text` | opcional |
| `created_at` | `timestamptz` default `now()` | |

`app/services/calendar_events.py::create_event` insere o evento e **garante**
`calendar_context.has_event = true` pra essa data (upsert, preservando `discount_rate`
existente) — assim o forecast baseado em LightGBM já enxerga o evento no próximo
`GET /api/sales/forecast-ml`. É **uma via só**: deletar todos os eventos de uma data
não volta `has_event` pra `false` automaticamente (um boolean só não dá pra saber se foi
setado por um evento ou pelo admin direto via `POST /api/sales/calendar-context`) —
se precisar desmarcar, edite a data direto na seção de calendário do Planning.

Usada por: `GET|POST /api/sales/calendar-events`, `DELETE /api/sales/calendar-events/{id}`
(admin-only). SQL incremental: `docs/migration_calendar_events.sql`.

---

## 2. SQL completo (rodar no Supabase SQL Editor)

Substitui `schema.sql` inteiro (mesma base, com as tabelas novas e ajustes acima).

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

---

## 3. Diferenças em relação ao `schema.sql` atual

- `products.category` ganhou `check` restringindo aos 6 valores de `ProductCategory` (antes era `text` livre).
- `sales` ganhou coluna `order_id` e agora é preenchida só via trigger (política de `insert`/`update` direta foi removida — nada deve escrever nela manualmente).
- `chat_messages` perdeu a coluna `ai_response` e ganhou `conversation_id` + `sender`; nova tabela `conversations` como pai.
- Novas tabelas: `orders`, `order_items`, `newsletter_subscribers`.
- `is_admin()` continua igual, mas agora também é referenciada pelas policies de `orders`, `order_items`, `conversations` e `chat_messages`.

## 4. O que precisa mudar no front depois de aplicar isso

- `src/types/user.ts`: `Role = 'admin' | 'customer'` (era `'manager' | 'client'`); atualizar todo lugar que compara `role === 'manager'`/`'client'` (`useAuthMock.ts`, `admin/layout.tsx`, `admin/users/page.tsx`, `register/page.tsx`).
- `src/types/cart.ts`: `Order` ganha `id` vindo do banco (`uuid`) em vez de `order-${Date.now()...}`, e `status`.
- `src/lib/product-data.ts`, `orders.ts`, `user-store.ts`, `chat-store.ts`: trocar leitura/escrita de `localStorage` por chamadas às rotas de `api-requirements.md` (ou Supabase client direto, conforme decisão do §12.4 daquele arquivo).
