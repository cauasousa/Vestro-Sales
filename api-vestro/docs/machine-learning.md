# Machine Learning — Sales Forecasting

How `GET /api/sales/forecast-ml` predicts next-week sales: the model, the features it trains on, how training works, and the known limitations.

## Overview

Vestro Sales ships two forecasting endpoints:

| Endpoint | Method | Notes |
|---|---|---|
| `GET /api/sales/forecast` | Least-squares trend line over the last 7 days | Always available, no training required |
| `GET /api/sales/forecast-ml` | **LightGBM regression**, informed by calendar context | Needs a trained model — see [Training](#training) |

This document covers the second one — the actual ML system.

## Model

A single [`LGBMRegressor`](https://lightgbm.readthedocs.io/) (LightGBM's scikit-learn API), trained with default hyperparameters. The target is **total revenue for a given day** (`sales.total_amount` summed per day).

Code: `app/ml/forecaster.py` (feature building + inference), `app/ml/train.py` (training).

## Features

Every prediction is built from a single day's feature row — nine columns, computed by `app/ml/forecaster.py::build_features_for_date`:

| Feature | Type | Source | Description |
|---|---|---|---|
| `day_of_week` | int 0–6 | derived from the date | Monday=0 … Sunday=6 |
| `is_weekend` | 0/1 | derived from the date | 1 if Saturday or Sunday |
| `rolling_mean_7d` | float | `sales` history | Mean daily revenue over the 7 days immediately before this one |
| `is_payday` | 0/1 | `calendar_context` (or derived) | True on the 5th or 20th of the month |
| `is_end_of_month` | 0/1 | `calendar_context` (or derived) | True on the last 3 days of the month |
| `days_until_holiday` | int | `calendar_context` (or derived) | Days until the next US federal holiday in `app/ml/calendar.py::US_HOLIDAYS`; `99` if none is registered |
| `discount_rate` | float 0–1 | `calendar_context` | A planned store-wide promotion signal for that day (business decision, not derived) |
| `is_holiday` | 0/1 | `calendar_context` (or derived) | True if the date is in `US_HOLIDAYS` |
| `has_event` | 0/1 | `calendar_context` | A one-off marketing event for that day, e.g. Black Friday (business decision, not derived) |

Two things worth calling out:

- **Only two features are actual business decisions**: `discount_rate` and `has_event`. Everything else is mechanically derived from the calendar date by `app/ml/calendar.py::derive_calendar_fields` — there's nothing for a human to decide, so the admin-facing `POST /api/sales/calendar-context` endpoint only accepts those two fields as input and recomputes the rest server-side on every upsert.
- **`rolling_mean_7d` is the only feature that isn't calendar-based** — it's the actual trailing average of recorded daily revenue, which is why forecasting *forward* requires a walk-forward loop (below) instead of a single batch prediction.

Without a `calendar_context` row for a date, the calendar-derived fields fall back to neutral defaults (no holiday, no event, no discount) — the forecast still runs, it just loses that signal for that day.

## Training

```bash
python -m app.ml.train                    # default: last 14 days held out for validation
python -m app.ml.train --holdout-days 30  # override
```

Or via the API: `POST /api/sales/retrain?holdout_days=14` (admin-only).

What happens (`app/ml/train.py`):

1. Pull the full daily revenue history from `sales`, aggregated by day.
2. Join in `calendar_context` for each of those days. Without this table populated, every day trains with contextual features at their defaults — only `day_of_week` / `is_weekend` / `rolling_mean_7d` carry real signal.
3. Build the feature matrix with the same `build_features_for_date` function production inference uses, so there's no train/serve skew.
4. Fit `LGBMRegressor` on a **temporal split** — the most recent `holdout_days` become validation, never a random split (which would leak future days into training).
5. Report the holdout **MAE** (mean absolute error, in currency units) and save the model with `joblib.dump()`.

Requires at least **14 days** of daily sales history (`MIN_TRAINING_DAYS` in `app/ml/train.py`) — fewer than that, training raises instead of producing a model.

### Where the model is stored

`joblib`-serialized at `app/ml/saved_models/lgb_sales_model.pkl` by default (overridable via `SALES_MODEL_PATH`). Not shipped in the repo — it's a build artifact, not source. `forecaster.load_model()` is `@lru_cache`d per-process and returns `None` if the file doesn't exist, which is what makes `GET /api/sales/forecast-ml` degrade to `model_available: false` instead of a 500 when no model has been trained yet.

### Keeping the model fresh

Two ways a model gets (re)trained:

- **On demand**: `POST /api/sales/retrain` — runs training in a threadpool (doesn't block the event loop) and clears `forecaster.load_model`'s cache afterward, so the very next `forecast-ml` call in the same process uses the new model without an API restart.
- **Automatically**: `app/services/scheduler.py::daily_retrain_loop`, started in `app/main.py`'s lifespan hook. An in-process async loop sleeps until 00:00 UTC, retrains, logs the result, and repeats. A failed run (e.g. not enough history yet) is logged and retried the next day — it doesn't crash the loop or the API.

## Inference: walk-forward forecasting

`GET /api/sales/forecast-ml` predicts **7 days ahead**, one day at a time (`app/services/forecast.py::get_ml_forecast`):

1. Load up to 14 days of recent `sales` history for the `rolling_mean_7d` feature.
2. For each of the next 7 days, in order: build its feature row (pulling `calendar_context` if available), predict, then **feed that prediction into the rolling-mean history used by the next day's feature row**.

This walk-forward approach is necessary because `rolling_mean_7d` depends on the days immediately before it — day 3 of the forecast needs days 1 and 2's *predicted* values once real history runs out. It's the same horizon strategy the simpler linear `/forecast` endpoint uses, applied to the LightGBM model instead of a trend line.

## Known limitations

- **Training data is synthetic today.** `import_data/10_sales_training_seed.sql` generates 584 days of synthetic revenue (2025-01-01 to 2026-08-07) correlated with `calendar_context` (payday, end-of-month, weekends, holidays, Black Friday) purely to give the model a non-trivial pattern to learn for demo purposes. Real production sales history will take months to accumulate the same volume.
- **Two holiday lists, not one.** `US_HOLIDAYS` in `app/ml/calendar.py` (used by the live API) and the `holidays` CTE at the top of `import_data/09_calendar_context.sql` (used only for bulk backfill) currently list the same dates by hand — if the date range extends past 2026 or outside the US, both need updating, or seeded and API-computed rows will disagree on `days_until_holiday`/`is_holiday` for the same date.
- **The daily retrain loop is single-process.** It runs fine for one worker/replica. If the API ever runs with `uvicorn --workers N` or multiple replicas behind a load balancer, each one fires its own loop and retrains independently at 00:00 UTC — harmless (just N redundant retrains writing the same `.pkl`), but if that's undesirable, swap it for an external scheduler (cron, a scheduled GitHub Action) calling `POST /api/sales/retrain` once.
- **`calendar_context.discount_rate` is a forecast signal, not a real discount.** It's decoupled from the `discounts` table that actually changes product prices (see `docs/database-schema.md` §1.9–1.10) — setting one doesn't set the other.
