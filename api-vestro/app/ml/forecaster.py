import datetime as dt
from functools import lru_cache
from pathlib import Path

import joblib
import lightgbm as lgb
import pandas as pd

from app.config import get_settings

FEATURE_COLUMNS = [
    "day_of_week",
    "is_weekend",
    "rolling_mean_7d",
    "is_payday",
    "is_end_of_month",
    "days_until_holiday",
    "discount_rate",
    "is_holiday",
    "has_event",
]


def build_features_for_date(
    target_date: dt.date, historical_sales: dict[dt.date, float], context_data: dict
) -> pd.DataFrame:
    """Builds the feature row for a single day (historical or future)."""
    recent_values = [v for d, v in sorted(historical_sales.items()) if d < target_date]
    window = recent_values[-7:]
    rolling_7d = sum(window) / len(window) if window else 0.0

    features = {
        "day_of_week": target_date.weekday(),
        "is_weekend": 1 if target_date.weekday() >= 5 else 0,
        "rolling_mean_7d": rolling_7d,
        # Contextual variables coming from `calendar_context` — see docs/machine-learning.md
        # for the fields this table is expected to provide.
        "is_payday": context_data.get("is_payday", 0),
        "is_end_of_month": context_data.get("is_end_of_month", 0),
        "days_until_holiday": context_data.get("days_until_holiday", 99),
        "discount_rate": context_data.get("discount_rate", 0.0),
        "is_holiday": context_data.get("is_holiday", 0),
        "has_event": context_data.get("has_event", 0),
    }
    return pd.DataFrame([features], columns=FEATURE_COLUMNS)


@lru_cache
def load_model() -> lgb.LGBMRegressor | None:
    """Loads the trained model from disk, or None if it hasn't been trained yet.

    No model file ships with the repo — see docs/machine-learning.md for what's needed
    to train one. Callers must treat `None` as "forecast unavailable", not an error.
    """
    path = Path(get_settings().sales_model_path)
    if not path.exists():
        return None
    return joblib.load(path)


def predict_next_day(
    model: lgb.LGBMRegressor,
    target_date: dt.date,
    historical_sales: dict[dt.date, float],
    context_data: dict,
) -> float:
    """Uses the trained model to predict next-day sales from history + context."""
    X = build_features_for_date(target_date, historical_sales, context_data)
    prediction = model.predict(X)[0]
    return max(0.0, float(prediction))
