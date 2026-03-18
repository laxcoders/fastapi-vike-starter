from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router, root_router
from app.config import settings
from app.database import close_all, init_redis
from app.middleware.errors import register_error_handlers
from app.middleware.logging import register_logging
from app.middleware.rate_limit import register_rate_limiting

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage connection lifecycle — startup and shutdown."""
    logger.info("app_starting", pool_size=settings.db_pool_size)
    try:
        await init_redis()
        logger.info("redis_connected")
    except Exception as exc:
        logger.warning("redis_connection_failed", exc=str(exc))

    yield

    logger.info("app_shutting_down")
    await close_all()
    logger.info("connections_closed")


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment="production" if not settings.debug else "development",
        )

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url="/api/docs" if settings.debug else None,
        openapi_url="/api/openapi.json" if settings.debug else None,
    )

    register_logging(app, debug=settings.debug)
    register_rate_limiting(app, limit=settings.rate_limit_per_minute)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(root_router)
    app.include_router(api_router)

    return app


app = create_app()
