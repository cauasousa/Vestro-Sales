"""Trains the sales LightGBM model and saves it to `Settings.sales_model_path`.

Run from the project root (venv activated):

    python -m app.ml.train

Needs a real stretch of daily history in `sales` (months, not the handful of seed rows in
import_data/05_sales.sql) and, ideally, matching rows in `calendar_context` for the same
date range — with that table missing/empty, every day's contextual features (is_payday,
is_holiday, discount_rate, ...) fall back to defaults, so the model can only learn the
day-of-week / rolling-mean pattern. See docs/miss_atribu.md for both.

After a successful run, restart the API — `forecaster.load_model()` is process-cached, so
a training run in a separate process doesn't refresh an already-running server.
"""

import argparse
import datetime as dt
from dataclasses import dataclass
from pathlib import Path

import lightgbm as lgb
import pandas as pd
from joblib import dump

from app.config import get_settings
from app.db import get_supabase
from app.ml.forecaster import build_features_for_date

MIN_TRAINING_DAYS = 14


@dataclass
class TrainResult:
    trained_days: int
    holdout_days: int
    holdout_mae: float | None
    model_path: str


def _daily_totals(rows: list[dict]) -> dict[dt.date, float]:
    totals: dict[dt.date, float] = {}
    for row in rows:
        created = dt.datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")).date()
        totals[created] = totals.get(created, 0.0) + float(row["total_amount"])
    return totals


def _build_training_frame(supabase) -> tuple[pd.DataFrame, pd.Series]:
    sales_rows = supabase.table("sales").select("total_amount, created_at").execute().data or []
    daily_totals = _daily_totals(sales_rows)
    if len(daily_totals) < MIN_TRAINING_DAYS:
        raise ValueError(
            f"Only {len(daily_totals)} day(s) of sales history found — need at least "
            f"{MIN_TRAINING_DAYS} before training produces anything useful. "
            "See docs/miss_atribu.md."
        )

    context_rows = supabase.table("calendar_context").select("*").execute().data or []
    context_by_date = {row["date"]: row for row in context_rows}

    ordered_days = sorted(daily_totals)
    feature_rows, targets = [], []
    for day in ordered_days:
        history_so_far = {d: v for d, v in daily_totals.items() if d < day}
        context_data = context_by_date.get(day.isoformat(), {})
        feature_rows.append(build_features_for_date(day, history_so_far, context_data))
        targets.append(daily_totals[day])

    X = pd.concat(feature_rows, ignore_index=True)
    y = pd.Series(targets, name="total_amount")
    return X, y


def train(holdout_days: int = 14) -> TrainResult:
    """Builds the training frame, fits the model, and saves it. Raises `ValueError` when
    there isn't enough history to train on — callers (CLI or API) decide how to surface that.
    """
    supabase = get_supabase()
    X, y = _build_training_frame(supabase)

    # Temporal split, never random — a random split would leak future days into training.
    if len(X) <= holdout_days:
        holdout_days = 0
    X_train, y_train = (X.iloc[:-holdout_days], y.iloc[:-holdout_days]) if holdout_days else (X, y)

    model = lgb.LGBMRegressor()
    model.fit(X_train, y_train)

    holdout_mae = None
    if holdout_days:
        X_test, y_test = X.iloc[-holdout_days:], y.iloc[-holdout_days:]
        predictions = model.predict(X_test)
        holdout_mae = float((predictions - y_test.to_numpy()).__abs__().mean())

    model_path = Path(get_settings().sales_model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    dump(model, model_path)

    return TrainResult(
        trained_days=len(X_train),
        holdout_days=holdout_days,
        holdout_mae=holdout_mae,
        model_path=str(model_path),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--holdout-days",
        type=int,
        default=14,
        help="Most recent N days held out for validation instead of used for training (default: 14).",
    )
    args = parser.parse_args()
    try:
        result = train(args.holdout_days)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    if result.holdout_mae is not None:
        print(f"Holdout MAE over last {result.holdout_days} day(s): {result.holdout_mae:.2f}")
    print(f"Saved model to {result.model_path} (trained on {result.trained_days} day(s)).")
