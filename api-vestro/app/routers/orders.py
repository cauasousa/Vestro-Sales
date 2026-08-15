from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_profile, get_optional_profile
from app.schemas import Order, OrderCreateRequest
from app.services.orders import create_order, get_order_with_owner, list_all_orders, list_orders_for_customer

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=Order, status_code=status.HTTP_201_CREATED)
async def place_order(
    payload: OrderCreateRequest,
    profile: Annotated[dict[str, Any] | None, Depends(get_optional_profile)],
) -> Order:
    customer_id = profile["id"] if profile else None
    return await create_order(payload, customer_id)


@router.get("", response_model=list[Order])
async def my_orders(
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> list[Order]:
    """Admins see every order (for the Orders tab); customers see only their own."""
    if profile["role"] == "admin":
        return await list_all_orders()
    return await list_orders_for_customer(profile["id"])


@router.get("/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    profile: Annotated[dict[str, Any] | None, Depends(get_optional_profile)],
) -> Order:
    result = await get_order_with_owner(order_id)
    if not result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    order, owner_id = result
    if owner_id is not None:
        is_owner = profile is not None and profile["id"] == owner_id
        is_admin = profile is not None and profile["role"] == "admin"
        if not is_owner and not is_admin:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    return order
