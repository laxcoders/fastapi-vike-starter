"""Tests for app lifespan — startup and shutdown."""

from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_lifespan_startup_shutdown() -> None:
    """The app should start and stop cleanly via the ASGI lifespan."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
