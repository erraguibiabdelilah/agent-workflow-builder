"""FastAPI application factory."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from .api import health, node_types, workflows, executions, credentials
from .auth.users import auth_backend, fastapi_users
from .auth.models import UserCreate, UserRead, UserUpdate
from .db.database import init_db, get_async_session
from .db.models import User
from .env import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title="AgentFlow API",
        description="Backend API for AgentFlow workflow automation",
        version="0.1.0",
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.app_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Auth routes
    app.include_router(
        fastapi_users.get_auth_router(auth_backend),
        prefix="/api/auth",
        tags=["auth"],
    )
    
    app.include_router(
        fastapi_users.get_register_router(UserRead, UserCreate),
        prefix="/api/auth",
        tags=["auth"],
    )
    
    app.include_router(
        fastapi_users.get_users_router(UserRead, UserUpdate),
        prefix="/api/fastapi-users",
        tags=["users"],
    )
    
    # API routes
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(node_types.router, prefix="/api", tags=["nodes"])
    app.include_router(workflows.router, prefix="/api", tags=["workflows"])
    app.include_router(executions.router, prefix="/api", tags=["executions"])
    app.include_router(credentials.router, prefix="/api", tags=["credentials"])
    
    # Test endpoint for debugging auth - with optional auth
    @app.get("/api/test/decode")
    async def test_decode(authorization: str = Header(None)):
        if not authorization:
            return {"error": "No auth header"}
        
        if not authorization.startswith("Bearer "):
            return {"error": "Invalid auth format"}
        
        token = authorization.replace("Bearer ", "")
        
        try:
            decoded = jwt.decode(
                token,
                settings.secret_key,
                algorithms=["HS256"],
                audience=["fastapi-users:auth"]
            )
            return {"decoded": decoded, "valid": True}
        except Exception as e:
            return {"error": str(e), "valid": False}
    
    # Simple /users/me endpoint
    @app.get("/api/users/me")
    async def get_current_user_info(
        authorization: str = Header(None),
        db: AsyncSession = Depends(get_async_session)
    ):
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
            
            return {
                "id": str(user.id),
                "email": user.email,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "is_verified": user.is_verified
            }
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    return app