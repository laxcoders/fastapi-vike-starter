"""Cron job registry — clean way to register Beat schedules.

Usage:
    from app.workers.registry import cron, register_all_crons

    @cron("nightly-monitoring", hour=2, minute=0)
    def my_task():
        ...

    # In celery_app.py:
    register_all_crons(celery)
"""

from collections.abc import Callable
from typing import Any

from celery import Celery
from celery.schedules import crontab

_CRON_REGISTRY: list[dict[str, Any]] = []


def cron(
    name: str,
    *,
    minute: str | int = "*",
    hour: str | int = "*",
    day_of_week: str | int = "*",
    day_of_month: str | int = "*",
    month_of_year: str | int = "*",
) -> Callable:
    """Decorator to register a Celery task as a cron job.

    Args:
        name: Unique name for the beat schedule entry.
        minute, hour, etc.: crontab fields, same as celery.schedules.crontab.
    """

    def decorator(func: Callable) -> Callable:
        _CRON_REGISTRY.append(
            {
                "name": name,
                "task": func,
                "schedule": crontab(
                    minute=minute,
                    hour=hour,
                    day_of_week=day_of_week,
                    day_of_month=day_of_month,
                    month_of_year=month_of_year,
                ),
            }
        )
        return func

    return decorator


def register_all_crons(celery_app: Celery) -> None:
    """Register all decorated cron jobs with Celery Beat."""
    for entry in _CRON_REGISTRY:
        task = entry["task"]
        # Ensure the function is a registered Celery task
        task_name = getattr(task, "name", None) or f"{task.__module__}.{task.__qualname__}"
        celery_app.conf.beat_schedule[entry["name"]] = {
            "task": task_name,
            "schedule": entry["schedule"],
        }
