-- ============================================================
-- sales — synthetic daily history for training the LightGBM model
-- (app/ml/train.py). NOT real revenue — 584 days (2025-01-01 ..
-- 2026-08-07) of generated data, one aggregated row per day.
--
-- ⚠️ This writes into the same `sales` table the admin dashboard
-- reads for revenue/metrics (GET /api/metrics, GET /api/sales/forecast).
-- Running this against a database anyone treats as "real" numbers
-- will make those numbers fake. Run it on a dev/staging Supabase
-- project, or be ready to delete these rows again (see bottom of
-- this file) once you've trained a model and don't need the ledger
-- rows anymore.
--
-- Date range deliberately stops at 2026-08-07, before the existing
-- seed dates in 04_order_items.sql / 05_sales.sql (08-08 .. 08-14) —
-- no overlap, no double-counted revenue for those days.
--
-- The daily total is a synthetic curve, not random noise: it bakes
-- in the same signals calendar_context encodes (payday on the
-- 5th/20th, end-of-month, Friday, weekends, holidays, Black Friday),
-- run 09_calendar_context.sql for the same range first so
-- app/ml/train.py actually has correlated features to learn from —
-- otherwise those columns are just noise to the model.
-- ============================================================

with holidays(d) as (
  values
    (date '2025-01-01'), (date '2025-07-04'), (date '2025-11-27'), (date '2025-12-25'),
    (date '2026-01-01'), (date '2026-07-04'), (date '2026-11-26'), (date '2026-12-25')
),
promo_days(d) as (
  values (date '2025-11-28'), (date '2026-11-27')  -- Black Friday
),
bounds as (
  select date '2025-01-01' as start_date, date '2026-08-07' as end_date
),
days as (
  select generate_series(start_date, end_date, interval '1 day')::date as d
  from bounds
),
calc as (
  select
    d.d,
    extract(dow from d.d)::int as dow,
    extract(day from d.d)::int as dom,
    (d.d - b.start_date) as day_index,
    (b.end_date - b.start_date) as total_days,
    exists (select 1 from holidays h where h.d = d.d) as is_holiday,
    exists (select 1 from promo_days p where p.d = d.d) as is_promo
  from days d, bounds b
)
insert into public.sales (quantity, total_amount, created_at)
select
  1,
  round((
    (
      600
      + (day_index::numeric / total_days) * 500                -- slow growth trend over the range
      + case when dow in (0, 6) then -150 else 0 end            -- weekend dip
      + case when dow = 5 then 100 else 0 end                   -- Friday bump
      + case when dom in (5, 20) then 200 else 0 end            -- payday bump
      + case when dom >= 28 then 150 else 0 end                 -- end-of-month bump
      + case when is_holiday then 100 else 0 end                -- holiday bump
      + case when is_promo then 400 else 0 end                  -- Black Friday spike
    ) * (0.85 + random() * 0.3)::numeric                        -- +/-15% noise
  )::numeric, 2) as total_amount,
  (d::text || 'T10:00:00Z')::timestamptz as created_at
from calc;

-- ------------------------------------------------------------
-- Cleanup (optional) — remove only these synthetic rows, leaves
-- real orders (order_id is not null) and 05_sales.sql's 4 rows
-- (outside this date range) untouched:
--
-- delete from public.sales
-- where order_id is null
--   and created_at >= '2025-01-01' and created_at < '2026-08-08';
-- ------------------------------------------------------------
