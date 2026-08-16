from typing import Literal

from pydantic import BaseModel, EmailStr

OrderStatus = Literal["placed", "paid", "shipped", "delivered", "cancelled"]


class CartItem(BaseModel):
    productId: str
    name: str
    price: float
    originalPrice: float | None = None
    image_url: str | None = None
    stock: int
    quantity: int


class OrderCustomer(BaseModel):
    fullName: str
    email: EmailStr
    address: str
    city: str
    postalCode: str


class OrderCreateRequest(BaseModel):
    items: list[CartItem]
    customer: OrderCustomer


class Order(BaseModel):
    id: str
    customerId: str | None = None
    items: list[CartItem]
    subtotal: float
    status: OrderStatus = "placed"
    customer: OrderCustomer
    createdAt: str
