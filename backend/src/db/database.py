"""Database setup and connection management."""
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..env import settings
from .models import Base


# Convert sqlite:/// to sqlite+aiosqlite:///
async_database_url = settings.database_url.replace("sqlite:///", "sqlite+aiosqlite:///")

# Create async SQLite engine
async_engine = create_async_engine(
    async_database_url,
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Also keep sync engine for migrations
sync_engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args={
        "check_same_thread": False,
        "timeout": 20,
    },
    poolclass=StaticPool,
)


async def create_tables():
    """Create all database tables."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async database session."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Initialize database tables."""
    await create_tables()