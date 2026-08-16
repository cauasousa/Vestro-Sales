import datetime as dt
from typing import Any

from app.db import get_supabase, run_query
from app.schemas import Discount, DiscountCreateRequest


def _row_to_discount(row: dict[str, Any]) -> Discount:
    return Discount(
        id=row["id"],
        scope=row["scope"],
        category=row.get("category"),
        productId=row.get("product_id"),
        productName=(row.get("products") or {}).get("name") if row.get("products") else None,
        percentage=row["percentage"],
        startDate=row["start_date"],
        endDate=row.get("end_date"),
        createdAt=row["created_at"],
    )


def _is_active(row: dict[str, Any], today: dt.date) -> bool:
    start = dt.date.fromisoformat(row["start_date"])
    end = dt.date.fromisoformat(row["end_date"]) if row.get("end_date") else start
    return start <= today <= end


async def list_discounts() -> list[Discount]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("discounts")
        .select("*, products(name)")
        .order("start_date", desc=True)
        .execute()
    )
    return [_row_to_discount(row) for row in (result.data or [])]


async def create_discount(payload: DiscountCreateRequest) -> Discount:
    supabase = get_supabase()
    row = {
        "scope": payload.scope,
        "category": payload.category if payload.scope == "category" else None,
        "product_id": payload.productId if payload.scope == "product" else None,
        "percentage": payload.percentage,
        "start_date": payload.startDate,
        "end_date": payload.endDate,
    }
    result = await run_query(lambda: supabase.table("discounts").insert(row).execute())
    return _row_to_discount(result.data[0])


async def update_discount(discount_id: str, payload: DiscountCreateRequest) -> Discount | None:
    supabase = get_supabase()
    row = {
        "scope": payload.scope,
        "category": payload.category if payload.scope == "category" else None,
        "product_id": payload.productId if payload.scope == "product" else None,
        "percentage": payload.percentage,
        "start_date": payload.startDate,
        "end_date": payload.endDate,
    }
    result = await run_query(
        lambda: supabase.table("discounts")
        .update(row)
        .eq("id", discount_id)
        .select("*, products(name)")
        .execute()
    )
    if not result.data:
        return None
    return _row_to_discount(result.data[0])


async def delete_discount(discount_id: str) -> bool:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("discounts").delete().eq("id", discount_id).execute()
    )
    return bool(result.data)


async def get_active_discount_rows(today: dt.date | None = None) -> list[dict[str, Any]]:
    """Raw active discount rows (scope/category/product_id/percentage), used to resolve
    effective prices for products and orders. Small admin-curated table — fetching all
    rows and filtering in Python is simpler than a date-window query and correctly
    handles single-day discounts (no end_date => active only on start_date)."""
    today = today or dt.datetime.now(dt.timezone.utc).date()
    supabase = get_supabase()
    try:
        result = await run_query(lambda: supabase.table("discounts").select("*").execute())
    except Exception:
        # `discounts` doesn't exist yet until the schema SQL (docs/database-schema.md
        # §2) has been run — degrade to "no discounts" instead of breaking every
        # product/order request.
        return []
    return [row for row in (result.data or []) if _is_active(row, today)]


def resolve_discount_for_product(product: dict[str, Any], active_discounts: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Most-specific-wins: product-level beats category-level beats store-wide. Ties
    within the same specificity are broken by picking the larger percentage."""
    product_matches = [d for d in active_discounts if d["scope"] == "product" and d["product_id"] == product["id"]]
    if product_matches:
        return max(product_matches, key=lambda d: d["percentage"])

    category_matches = [d for d in active_discounts if d["scope"] == "category" and d["category"] == product["category"]]
    if category_matches:
        return max(category_matches, key=lambda d: d["percentage"])

    all_matches = [d for d in active_discounts if d["scope"] == "all"]
    if all_matches:
        return max(all_matches, key=lambda d: d["percentage"])

    return None


def apply_discount(product: dict[str, Any], active_discounts: list[dict[str, Any]]) -> dict[str, Any]:
    """Mutates `product` in place, adding discount_percent/discounted_price."""
    match = resolve_discount_for_product(product, active_discounts)
    if match:
        product["discount_percent"] = match["percentage"]
        product["discounted_price"] = round(product["price"] * (1 - match["percentage"] / 100), 2)
    else:
        product["discount_percent"] = None
        product["discounted_price"] = None
    return product
