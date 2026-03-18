"""Database engine, session factory, and shared Redis connection pool.

All connection lifecycle is managed by the FastAPI lifespan in main.py.
"""

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

redis_pool: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Initialize the shared Redis connection. Called during app startup."""
    global redis_pool
    redis_pool = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )
    return redis_pool


async def get_redis() -> aioredis.Redis:
    """Get the shared Redis connection. Raises if not initialized."""
    if redis_pool is None:
        raise RuntimeError("Redis not initialized — call init_redis() first")
    return redis_pool


async def close_all() -> None:
    """Dispose of all connections. Called during app shutdown."""
    global redis_pool
    if redis_pool is not None:
        await redis_pool.aclose()
        redis_pool = None
    await engine.dispose()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
