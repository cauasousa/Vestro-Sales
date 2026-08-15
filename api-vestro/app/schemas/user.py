from pydantic import BaseModel, EmailStr


class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "customer"
