import datetime as dt

# Fixed US federal holidays for the years this app has seed/forecast data for. Extend this
# list by hand as the range of dates the app cares about grows — see docs/machine-learning.md.
US_HOLIDAYS: list[dt.date] = [
    dt.date(2025, 1, 1), dt.date(2025, 7, 4), dt.date(2025, 11, 27), dt.date(2025, 12, 25),
    dt.date(2026, 1, 1), dt.date(2026, 7, 4), dt.date(2026, 11, 26), dt.date(2026, 12, 25),
]


def derive_calendar_fields(date: dt.date) -> dict:
    """Computes the calendar_context columns that follow mechanically from the date itself
    (payday, end of month, distance to the next known holiday) — kept out of admin input
    since there's nothing for a human to decide here. See docs/machine-learning.md for why
    only discount_rate/has_event (CalendarContextIn) are actual business decisions.
    """
    upcoming = [h for h in US_HOLIDAYS if h >= date]
    return {
        "is_payday": date.day in (5, 20),
        "is_end_of_month": date.day >= 28,
        "days_until_holiday": min((h - date).days for h in upcoming) if upcoming else 99,
        "is_holiday": date in US_HOLIDAYS,
    }
