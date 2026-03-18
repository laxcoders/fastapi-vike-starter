from celery import Celery

from app.config import settings

celery = Celery(
    "app",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
)

# Auto-discover tasks in worker modules
celery.autodiscover_tasks(["app.workers"])

# Register cron jobs from the registry
from app.workers.registry import register_all_crons  # noqa: E402

register_all_crons(celery)
