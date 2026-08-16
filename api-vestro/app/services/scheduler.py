import asyncio
import datetime as dt

from app.services.forecast import retrain_model

RETRAIN_HOUR_UTC = 0


def _seconds_until_next_run(now: dt.datetime, hour: int = RETRAIN_HOUR_UTC) -> float:
    next_run = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    if next_run <= now:
        next_run += dt.timedelta(days=1)
    return (next_run - now).total_seconds()


async def daily_retrain_loop() -> None:
    """Retrains the sales forecast model once a day at 00:00 UTC.

    Runs in-process for the lifetime of the API — fine for a single-worker deployment.
    If this API ever runs with multiple workers/replicas, every one of them fires this
    loop independently (harmless, just redundant retraining) — move to an external
    scheduler hitting `POST /api/sales/retrain` instead if that becomes a problem. See
    docs/miss_atribu.md.

    A failed run (e.g. not enough `sales` history yet) is logged and skipped — it doesn't
    stop the loop from trying again at the next scheduled time.
    """
    while True:
        now = dt.datetime.now(dt.timezone.utc)
        await asyncio.sleep(_seconds_until_next_run(now))
        try:
            result = await retrain_model()
            print(
                f"[daily_retrain] trained on {result.trained_days} day(s), "
                f"holdout_mae={result.holdout_mae}"
            )
        except Exception as exc:
            print(f"[daily_retrain] failed: {exc}")
