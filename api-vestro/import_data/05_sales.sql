-- ============================================================
-- sales — extra historical rows for the dashboard chart
-- (SalesChart.tsx expects a run of days to draw a trend line).
-- These are NOT linked to the seed orders above (order_id/customer_id
-- left null) — they just backfill daily revenue totals matching the
-- shape of the old mock data (src/lib/mock-admin.ts::mockSalesData),
-- so /admin looks populated once it's wired to read from this table
-- instead of the mock.
-- Do not add rows here for 2026-08-10 / 08-12 / 08-14 — those days
-- are already covered by the sales the trigger created in
-- 04_order_items.sql; adding more would double-count that revenue.
-- ============================================================

insert into public.sales (product_id, customer_id, quantity, total_amount, created_at)
values
  ((select id from public.products where name = 'Compact Mechanical Keyboard'), null, 1, 1200.00, '2026-08-08T10:00:00Z'),
  ((select id from public.products where name = 'Keyboard and Mouse Set'), null, 1, 1800.00, '2026-08-09T10:00:00Z'),
  ((select id from public.products where name = 'Yellow Wireless Mouse'), null, 1, 950.00,  '2026-08-11T10:00:00Z'),
  ((select id from public.products where name = 'Wi-Fi Router Pro'), null, 1, 1650.00, '2026-08-13T10:00:00Z');
