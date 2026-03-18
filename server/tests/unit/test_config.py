"""Tests for config validation."""

import pytest


class TestSettingsValidation:
    def test_production_rejects_weak_secret(self) -> None:
        """In production (debug=False), the weak default key should be rejected."""
        from app.config import Settings

        with pytest.raises(ValueError, match="SECRET_KEY must be set"):
            Settings(debug=False, secret_key="local-dev-key-do-not-use-in-production")

    def test_debug_allows_weak_secret(self) -> None:
        """In debug mode, the weak default key is fine."""
        from app.config import Settings

        s = Settings(debug=True, secret_key="local-dev-key-do-not-use-in-production")
        assert s.debug is True

    def test_production_accepts_strong_secret(self) -> None:
        """A strong secret should be accepted in production."""
        from app.config import Settings

        s = Settings(debug=False, secret_key="a-very-strong-random-production-key-1234")
        assert s.secret_key == "a-very-strong-random-production-key-1234"

    def test_cors_wildcard_mixed_returns_wildcard(self) -> None:
        """Mixing '*' with specific origins should still return wildcard."""
        from app.config import Settings

        s = Settings(debug=True, cors_origins="http://localhost:5173,*")
        assert s.cors_origin_list == ["*"]
