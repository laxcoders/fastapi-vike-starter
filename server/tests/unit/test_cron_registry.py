from unittest.mock import MagicMock

from app.workers.registry import _CRON_REGISTRY, cron, register_all_crons


class TestCronRegistry:
    def test_cron_decorator_registers_function(self) -> None:
        initial_count = len(_CRON_REGISTRY)

        @cron("test-cron-job", hour=3, minute=30)
        def my_test_task() -> None:
            pass

        assert len(_CRON_REGISTRY) == initial_count + 1
        entry = _CRON_REGISTRY[-1]
        assert entry["name"] == "test-cron-job"
        assert entry["task"] is my_test_task

    def test_register_all_crons_adds_to_beat_schedule(self) -> None:
        mock_celery = MagicMock()
        mock_celery.conf.beat_schedule = {}

        register_all_crons(mock_celery)

        # Should have at least the entries registered above + nightly-monitoring
        assert len(mock_celery.conf.beat_schedule) > 0
