"""FastAPI-Users integration models."""
from typing import Optional
from uuid import UUID

from fastapi_users import schemas
from pydantic import EmailStr


class UserRead(schemas.BaseUser[str]):
    """User read schema."""
    email: EmailStr
    is_active: bool
    is_superuser: bool
    is_verified: bool


class UserCreate(schemas.BaseUserCreate):
    """User creation schema."""
    email: EmailStr
    password: str
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    is_verified: Optional[bool] = False


class UserUpdate(schemas.BaseUserUpdate):
    """User update schema."""
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    is_verified: Optional[bool] = None