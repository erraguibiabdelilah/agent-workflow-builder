"""Authentication dependencies."""
from typing import Optional

from fastapi import Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from ..db.database import get_async_session
from ..db.models import User
from ..env import settings


async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """Get current authenticated user from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        decoded = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            audience=["fastapi-users:auth"]
        )
        user_id = decoded["sub"]
        
        # Get user from database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User is inactive")
        
        return user
        
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get current active user (alias for compatibility)."""
    return user
