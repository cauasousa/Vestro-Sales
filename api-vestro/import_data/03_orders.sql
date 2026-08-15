-- ============================================================
-- orders
-- 2 orders from logged-in customers (fixed UUIDs from 02_profiles.sql)
-- + 1 guest checkout (customer_id null), to cover both cases the
-- checkout flow supports today (src/app/(app)/(public)/checkout).
-- subtotal must match the sum of the order_items added in
-- 04_order_items.sql for that order.
-- ============================================================

insert into public.orders (id, customer_id, full_name, email, address, city, postal_code, subtotal, status, created_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Alex Rivera', 'alex.rivera@example.com', '482 Oakwood Ave', 'Austin', '73301', 129.70, 'paid', '2026-08-10T14:22:00Z'),
  ('aaaaaaaa-0000-4000-8000-000000000002', '33333333-3333-3333-3333-333333333333',
   'Jamie Chen', 'jamie.chen@example.com', '19 Harbor View Rd', 'Seattle', '98101', 149.90, 'shipped', '2026-08-12T09:05:00Z'),
  ('aaaaaaaa-0000-4000-8000-000000000003', null,
   'Jordan Guest', 'jordan.guest@example.com', '77 Maple St', 'Denver', '80202', 59.80, 'placed', '2026-08-14T18:40:00Z');
