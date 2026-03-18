"""Tests for database module — init_redis, get_redis, close_all, get_db rollback."""

import pytest

from app.database import close_all, get_redis, init_redis


class TestRedisLifecycle:
    async def test_get_redis_before_init_raises(self) -> None:
        """get_redis should raise if Redis was never initialized."""
        import app.database

        original = app.database.redis_pool
        app.database.redis_pool = None
        try:
            with pytest.raises(RuntimeError, match="Redis not initialized"):
                await get_redis()
        finally:
            app.database.redis_pool = original

    async def test_init_and_get_redis(self) -> None:
        """init_redis should create a connection, get_redis should return it."""
        import app.database

        original = app.database.redis_pool
        app.database.redis_pool = None
        try:
            # init_redis will fail to connect in test env (no Redis), but the
            # object should still be created
            r = await init_redis()
            assert r is not None
            r2 = await get_redis()
            assert r2 is r
        finally:
            if app.database.redis_pool is not None:
                await app.database.redis_pool.aclose()
            app.database.redis_pool = original

    async def test_close_all(self) -> None:
        """close_all should dispose Redis and engine without errors."""
        # Just verify it doesn't raise — engine disposal is idempotent
        import app.database

        original = app.database.redis_pool
        app.database.redis_pool = None
        try:
            await close_all()  # Should not raise even with no Redis
        finally:
            app.database.redis_pool = original
