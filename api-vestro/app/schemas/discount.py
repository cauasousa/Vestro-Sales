from typing import Literal

from pydantic import BaseModel, Field, model_validator

DiscountScope = Literal["all", "category", "product"]


class DiscountCreateRequest(BaseModel):
    scope: DiscountScope
    category: str | None = None
    productId: str | None = None
    percentage: float = Field(gt=0, le=100)
    startDate: str
    endDate: str | None = None

    @model_validator(mode="after")
    def _validate_scope_fields(self) -> "DiscountCreateRequest":
        if self.scope == "category" and not self.category:
            raise ValueError("category is required when scope is 'category'")
        if self.scope == "product" and not self.productId:
            raise ValueError("productId is required when scope is 'product'")
        if self.scope == "all" and (self.category or self.productId):
            raise ValueError("category/productId must be empty when scope is 'all'")
        if self.endDate and self.endDate < self.startDate:
            raise ValueError("endDate must be on or after startDate")
        return self


class Discount(BaseModel):
    id: str
    scope: DiscountScope
    category: str | None = None
    productId: str | None = None
    productName: str | None = None
    percentage: float
    startDate: str
    endDate: str | None = None
    createdAt: str
