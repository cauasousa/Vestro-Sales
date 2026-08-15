from pydantic import BaseModel, EmailStr


class Profile(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None
    role: str
    created_at: str | None = None


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Session(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int | None = None
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: Profile
    session: Session | None = None
