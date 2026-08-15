-- ============================================================
-- order_items
-- Inserting these fires trg_order_item_to_sale (schema.sql), which
-- auto-creates the matching public.sales rows — do NOT insert sales
-- manually for these same orders afterwards.
-- product_id is looked up by name so this doesn't depend on knowing
-- the uuid Postgres generated in 01_products.sql.
-- ============================================================

-- Order 1 (Alex Rivera) — subtotal 129.70
insert into public.order_items (order_id, product_id, name, price, quantity)
values
  ('aaaaaaaa-0000-4000-8000-000000000001',
   (select id from public.products where name = 'Compact Mechanical Keyboard'),
   'Compact Mechanical Keyboard', 89.90, 1),
  ('aaaaaaaa-0000-4000-8000-000000000001',
   (select id from public.products where name = 'Protective Phone Case'),
   'Protective Phone Case', 19.90, 2);

-- Order 2 (Jamie Chen) — subtotal 149.90
insert into public.order_items (order_id, product_id, name, price, quantity)
values
  ('aaaaaaaa-0000-4000-8000-000000000002',
   (select id from public.products where name = 'Wi-Fi Router Pro'),
   'Wi-Fi Router Pro', 149.90, 1);

-- Order 3 (guest: Jordan Guest) — subtotal 59.80
insert into public.order_items (order_id, product_id, name, price, quantity)
values
  ('aaaaaaaa-0000-4000-8000-000000000003',
   (select id from public.products where name = 'Yellow Wireless Mouse'),
   'Yellow Wireless Mouse', 34.90, 1),
  ('aaaaaaaa-0000-4000-8000-000000000003',
   (select id from public.products where name = 'Mobile Phone Stand'),
   'Mobile Phone Stand', 24.90, 1);
