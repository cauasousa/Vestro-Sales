from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_admin
from app.schemas import Discount, DiscountCreateRequest
from app.services import discounts as discounts_service

router = APIRouter(prefix="/api/discounts", tags=["discounts"])


@router.get("", response_model=list[Discount])
async def list_discounts(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> list[Discount]:
    return await discounts_service.list_discounts()


@router.post("", response_model=Discount, status_code=status.HTTP_201_CREATED)
async def create_discount(
    payload: DiscountCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> Discount:
    return await discounts_service.create_discount(payload)


@router.patch("/{discount_id}", response_model=Discount)
async def update_discount(
    discount_id: str,
    payload: DiscountCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> Discount:
    updated = await discounts_service.update_discount(discount_id, payload)
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discount not found")
    return updated


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount(
    discount_id: str,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> None:
    deleted = await discounts_service.delete_discount(discount_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Discount not found")
