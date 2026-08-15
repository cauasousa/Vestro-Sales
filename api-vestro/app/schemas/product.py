from typing import Literal

from pydantic import BaseModel

ProductCategory = Literal["accessories", "audio", "desk", "mobile", "network", "work"]


class Product(BaseModel):
    id: str
    name: str
    description: str | None = None
    category: str
    price: float
    stock: int
    image_url: str | None = None
    is_active: bool
    created_at: str
    updated_at: str


class ProductCreateRequest(BaseModel):
    name: str
    description: str | None = None
    category: ProductCategory
    price: float
    stock: int = 0
    image_url: str | None = None


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    category: ProductCategory | None = None
    price: float | None = None
    stock: int | None = None
    image_url: str | None = None
    is_active: bool | None = None
