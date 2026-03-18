import asyncio

import structlog

from app.workers.celery_app import celery
from app.workers.registry import cron

logger = structlog.get_logger()


@celery.task(name="app.workers.monitoring_worker.health_check")
def health_check() -> dict:
    """Simple task to verify Celery is working."""
    return {"status": "ok", "worker": "celery"}


@celery.task(name="app.workers.monitoring_worker.cleanup_expired_tokens")
@cron("cleanup-expired-tokens", hour=3, minute=0)
def cleanup_expired_tokens() -> dict:
    """Nightly cleanup of expired verification/reset tokens."""
    from app.database import async_session_factory
    from app.services.token_service import delete_expired_tokens

    async def _run() -> int:
        async with async_session_factory() as db:
            count = await delete_expired_tokens(db)
            await db.commit()
            return count

    count = asyncio.run(_run())
    logger.info("expired_tokens_cleaned", count=count)
    return {"status": "ok", "deleted": count}
