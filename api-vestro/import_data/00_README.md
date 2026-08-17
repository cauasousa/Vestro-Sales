# Import Data — Vestro Sales

Sample data to populate every table created by the schema (see `docs/database-schema.md`). Meant to be pasted into the **Supabase SQL Editor**, one file at a time, **in numbered order** — each file depends on the previous one via foreign keys.

## Execution order

| # | File | Table | Depends on |
|---|---|---|---|
| 1 | `01_products.sql` | `products` | — |
| 2 | `02_profiles.sql` | `auth.users` + `profiles` | — |
| 3 | `03_orders.sql` | `orders` | `profiles` (2 of the 3 orders; 1 is a guest checkout) |
| 4 | `04_order_items.sql` | `order_items` | `orders`, `products` — **generates `sales` on its own** (trigger) |
| 5 | `05_sales.sql` | `sales` | `products` — only extra history rows, doesn't duplicate what the trigger already created |
| 6 | `06_conversations.sql` | `conversations` | `profiles` |
| 7 | `07_chat_messages.sql` | `chat_messages` | `conversations` |
| 8 | `08_newsletter_subscribers.sql` | `newsletter_subscribers` | — |
| 9 | `09_calendar_context.sql` | `calendar_context` | — (table must already exist, see `docs/database-schema.md` §1.9/§2) |
| 10 | `10_sales_training_seed.sql` | `sales` | — |

Run the schema SQL first (`docs/database-schema.md` §2 — creates the tables). Then these files in order — `01`–`08` are the product's "normal" seed; `09` and `10` are **optional**, only needed to train the forecasting model (`app/ml/train.py`, see `docs/machine-learning.md`).

## ⚠️ About `02_profiles.sql`

`profiles.id` is a foreign key to `auth.users.id` — you can't insert a standalone profile. This file inserts directly into `auth.users` (via `pgcrypto`, password `demo123` for all 3 users) to satisfy that FK, which is common for **local development** seeds, but:

- This is **not the recommended production flow** — in production, create users via `supabase.auth.admin.createUser()` (Admin SDK, needs `SUPABASE_SERVICE_ROLE_KEY`) or through the Supabase dashboard's **Authentication** tab.
- The exact structure of `auth.users` can vary between GoTrue versions (Supabase's auth service). If the `insert` fails on a column, that's why — create the 3 users manually through the dashboard (same emails below) and then run only the `update` part of the file to set `role`/`full_name`.
- The 3 UUIDs below are fixed on purpose, so every other file (`orders`, `conversations`, etc.) can reference them without a subquery:

| UUID | Email | Name | Role |
|---|---|---|---|
| `11111111-1111-1111-1111-111111111111` | `admin@vestro.com` | Admin Vestro | `admin` |
| `22222222-2222-2222-2222-222222222222` | `alex.rivera@example.com` | Alex Rivera | `customer` |
| `33333333-3333-3333-3333-333333333333` | `jamie.chen@example.com` | Jamie Chen | `customer` |

If you create the users through the dashboard instead of running the SQL directly, the UUIDs will be different (Supabase-generated) — swap the 3 fixed UUIDs for the real ones in `03_orders.sql`, `06_conversations.sql`, and `07_chat_messages.sql` before running them.

## ⚠️ About `sales`

`sales` is populated **automatically** by a trigger (`trg_order_item_to_sale`) every time a row is inserted into `order_items` — don't insert into it manually for real orders, or revenue will be double-counted. `05_sales.sql` only adds extra history points (no `order_id`, the column is nullable) to give the dashboard chart more trend data, without being tied to any order.

## ⚠️ About `09_calendar_context.sql` and `10_sales_training_seed.sql`

These two are **optional** and exist purely to have enough data to run `python -m app.ml.train` (the forecast at `GET /api/sales/forecast-ml` works fine without them, it just always returns `model_available: false`). Run both together, in this order, so `calendar_context` and the synthetic `sales` history cover the same period — without that the training's contextual features (`is_payday`, `is_holiday`, etc.) stay at their defaults and the model learns nothing from them.

`10_sales_training_seed.sql` inserts **584 days** of synthetic revenue (2025-01-01 to 2026-08-07) into the `sales` table — the same one that feeds `GET /api/metrics` and `GET /api/sales/forecast`. Only run it against a dev/staging database, or delete the rows afterward (cleanup instructions are at the end of the file itself).

## Reset (optional)

To clear everything and start over, in reverse order:

```sql
truncate public.newsletter_subscribers;
truncate public.chat_messages, public.conversations cascade;
truncate public.sales, public.order_items, public.orders cascade;
truncate public.products cascade;
-- profiles/auth.users: delete manually through the Authentication tab, or:
delete from auth.users where email in ('admin@vestro.com', 'alex.rivera@example.com', 'jamie.chen@example.com');
```
