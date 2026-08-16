# Import Data — Vestro Sales

Dados de exemplo para popular cada tabela criada por `schema.sql` (ver `docs/database-schema.md`). Pensado para colar no **Supabase SQL Editor**, um arquivo de cada vez, **na ordem numerada** — cada arquivo depende do anterior via foreign key.

## Ordem de execução

| # | Arquivo | Tabela | Depende de |
|---|---|---|---|
| 1 | `01_products.sql` | `products` | — |
| 2 | `02_profiles.sql` | `auth.users` + `profiles` | — |
| 3 | `03_orders.sql` | `orders` | `profiles` (2 dos 3 pedidos; 1 é guest checkout) |
| 4 | `04_order_items.sql` | `order_items` | `orders`, `products` — **gera `sales` sozinho** (trigger) |
| 5 | `05_sales.sql` | `sales` | `products` — só as linhas extras de histórico, não duplica o que o trigger já criou |
| 6 | `06_conversations.sql` | `conversations` | `profiles` |
| 7 | `07_chat_messages.sql` | `chat_messages` | `conversations` |
| 8 | `08_newsletter_subscribers.sql` | `newsletter_subscribers` | — |
| 9 | `09_calendar_context.sql` | `calendar_context` | — (tabela precisa existir, ver `docs/database-schema.md` §1.9/§2) |
| 10 | `10_sales_training_seed.sql` | `sales` | — |

Rode `schema.sql` primeiro (cria as tabelas). Depois esses arquivos em ordem — `01`–`08` são o seed "normal" do produto; `09` e `10` são **opcionais**, só necessários pra treinar o modelo de forecast (`app/ml/train.py`, ver `docs/miss_atribu.md`).

## ⚠️ Sobre `02_profiles.sql`

`profiles.id` é uma foreign key pra `auth.users.id` — não dá pra inserir um profile "solto". O arquivo insere direto em `auth.users` (via `pgcrypto`, senha `demo123` para os 3 usuários) pra satisfazer essa FK, o que é comum em seeds de **desenvolvimento local**, mas:

- Isso **não é o fluxo recomendado em produção** — lá, crie usuários via `supabase.auth.admin.createUser()` (Admin SDK, precisa da `SUPABASE_SERVICE_ROLE_KEY`) ou pela aba **Authentication** do painel Supabase.
- A estrutura exata da tabela `auth.users` pode variar entre versões do GoTrue (o serviço de auth do Supabase). Se o `insert` falhar por causa de uma coluna, é isso — crie os 3 usuários manualmente pelo painel (mesmos e-mails abaixo) e depois rode só a parte de `update` do arquivo pra ajustar `role`/`full_name`.
- Os 3 UUIDs abaixo são fixos de propósito, pra todos os outros arquivos (`orders`, `conversations`, etc.) poderem referenciá-los sem subquery:

| UUID | Email | Nome | Role |
|---|---|---|---|
| `11111111-1111-1111-1111-111111111111` | `admin@vestro.com` | Admin Vestro | `admin` |
| `22222222-2222-2222-2222-222222222222` | `alex.rivera@example.com` | Alex Rivera | `customer` |
| `33333333-3333-3333-3333-333333333333` | `jamie.chen@example.com` | Jamie Chen | `customer` |

Se você criar os usuários pelo painel em vez de rodar o SQL direto, os UUIDs vão ser outros (gerados pelo Supabase) — troque os 3 UUIDs fixos pelos reais em `03_orders.sql`, `06_conversations.sql` e `07_chat_messages.sql` antes de rodar.

## ⚠️ Sobre `sales`

`sales` é alimentada **automaticamente** por um trigger (`trg_order_item_to_sale`) toda vez que uma linha é inserida em `order_items` — não insira ali manualmente para pedidos reais, ou a receita fica duplicada. `05_sales.sql` só adiciona pontos de histórico extra (sem `order_id`, coluna é nullable) pra deixar o gráfico do dashboard com mais dados de tendência, sem estar ligado a nenhum pedido.

## ⚠️ Sobre `09_calendar_context.sql` e `10_sales_training_seed.sql`

Esses dois são **opcionais** e servem só pra ter dados suficientes pra rodar
`python -m app.ml.train` (o forecast em `GET /api/sales/forecast-ml` funciona sem eles,
só que sempre devolve `model_available: false`). Rode os dois juntos, nessa ordem, pra
`calendar_context` e o histórico sintético de `sales` cobrirem o mesmo período — sem isso
as features contextuais do treino (`is_payday`, `is_holiday`, etc.) ficam em default e o
modelo não aprende nada com elas.

`10_sales_training_seed.sql` insere **584 dias** de receita sintética (2025-01-01 a
2026-08-07) na tabela `sales` — a mesma que alimenta `GET /api/metrics` e
`GET /api/sales/forecast`. Rode só em banco de dev/staging, ou apague as linhas depois
(instruções de cleanup no fim do próprio arquivo).

## Reset (opcional)

Pra limpar e testar de novo, na ordem inversa:

```sql
truncate public.newsletter_subscribers;
truncate public.chat_messages, public.conversations cascade;
truncate public.sales, public.order_items, public.orders cascade;
truncate public.products cascade;
-- profiles/auth.users: delete manualmente pelo painel Authentication, ou:
delete from auth.users where email in ('admin@vestro.com', 'alex.rivera@example.com', 'jamie.chen@example.com');
```
