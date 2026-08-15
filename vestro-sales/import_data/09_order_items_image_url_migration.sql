-- ============================================================
-- Migration: order_items.image_url
-- order_items only ever stored name/price/quantity snapshots — the
-- product's image_url was never persisted, so order history (admin
-- and customer) had no way to show a product thumbnail. This adds
-- the column; existing rows backfill from the current product image
-- (best effort — the product may have changed since the order).
-- ============================================================

alter table public.order_items add column if not exists image_url text;

update public.order_items oi
set image_url = p.image_url
from public.products p
where oi.product_id = p.id
  and oi.image_url is null;
