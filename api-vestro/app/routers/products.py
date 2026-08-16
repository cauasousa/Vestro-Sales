from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_admin
from app.db import get_supabase, run_maybe_single, run_query
from app.schemas import Product, ProductCreateRequest, ProductUpdateRequest
from app.services.discounts import apply_discount, get_active_discount_rows

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/categories", response_model=list[str])
async def list_categories() -> list[str]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("products").select("category").eq("is_active", True).execute()
    )
    return sorted({row["category"] for row in (result.data or [])})


@router.get("", response_model=list[Product])
async def list_products(
    category: str | None = None,
    search: str | None = None,
    featured: bool = False,
    limit: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[Product]:
    supabase = get_supabase()

    def query():
        q = supabase.table("products").select("*").eq("is_active", True)
        if category:
            q = q.eq("category", category)
        if search:
            q = q.ilike("name", f"%{search}%")
        q = q.order("created_at", desc=True)
        effective_limit = limit or (4 if featured else None)
        if effective_limit:
            q = q.limit(effective_limit)
        return q.execute()

    result = await run_query(query)
    products = result.data or []

    active_discounts = await get_active_discount_rows()
    return [apply_discount(p, active_discounts) for p in products]


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str) -> Product:
    supabase = get_supabase()
    product = await run_maybe_single(
        lambda: supabase.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    active_discounts = await get_active_discount_rows()
    return apply_discount(product, active_discounts)


@router.post("", response_model=Product, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> Product:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("products").insert(payload.model_dump()).execute()
    )
    return result.data[0]


@router.patch("/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    payload: ProductUpdateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> Product:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("products").update(updates).eq("id", product_id).execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return result.data[0]


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> None:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("products").delete().eq("id", product_id).execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
