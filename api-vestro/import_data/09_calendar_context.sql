-- ============================================================
-- calendar_context — feeds the LightGBM sales forecast
-- (GET /api/sales/forecast-ml, app/ml/forecaster.py). Table must
-- already exist — see docs/database-schema.md §1.9 / §2.
--
-- Range: 2025-01-01 .. 2026-08-23. The lower bound matches
-- 10_sales_training_seed.sql's synthetic history (so the training
-- script in app/ml/train.py has real context to join against for
-- every historical day, not just defaults). The upper bound covers
-- today (2026-08-16, per this repo's seed dates) plus the 7-day
-- horizon GET /api/sales/forecast-ml predicts.
--
-- is_payday / is_end_of_month are derived straight from the date
-- (5th/20th of the month, last 3 days of the month) rather than
-- requiring manual input for every single day — only the holiday
-- list below needs to be maintained by hand.
--
-- Re-running this file is safe: `on conflict (date) do nothing`.
-- ============================================================

with holidays(d) as (
  values
    (date '2025-01-01'), (date '2025-07-04'), (date '2025-11-27'), (date '2025-12-25'),
    (date '2026-01-01'), (date '2026-07-04'), (date '2026-11-26'), (date '2026-12-25')
),
-- Not federal holidays, but planned-promotion days — drive discount_rate/has_event
-- without also flipping is_holiday (store stays open, just runs a sale).
promo_days(d, rate) as (
  values
    (date '2025-11-28', 0.20),  -- Black Friday 2025
    (date '2026-11-27', 0.20)   -- Black Friday 2026
),
days as (
  select generate_series('2025-01-01'::date, '2026-08-23'::date, interval '1 day')::date as d
)
insert into public.calendar_context
  (date, is_payday, is_end_of_month, days_until_holiday, discount_rate, is_holiday, has_event)
select
  d.d,
  extract(day from d.d)::int in (5, 20) as is_payday,
  extract(day from d.d)::int >= 28 as is_end_of_month,
  coalesce((select min(h.d - d.d) from holidays h where h.d >= d.d), 99) as days_until_holiday,
  coalesce((select rate from promo_days p where p.d = d.d), 0) as discount_rate,
  exists (select 1 from holidays h where h.d = d.d) as is_holiday,
  exists (select 1 from promo_days p where p.d = d.d) or exists (select 1 from holidays h where h.d = d.d) as has_event
from days d
on conflict (date) do nothing;
