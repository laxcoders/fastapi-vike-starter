"""Tests for error handling middleware — covers the global exception handlers."""

from httpx import AsyncClient


async def test_validation_error_returns_envelope(client: AsyncClient) -> None:
    """Sending invalid JSON to a validated endpoint should return the error envelope."""
    response = await client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": "x"},
    )
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "ValidationError"
    assert data["error"]["message"] == "Request validation failed"
    assert isinstance(data["error"]["detail"], list)


async def test_overlong_password_rejected(client: AsyncClient) -> None:
    """Password exceeding max_length should be rejected."""
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "x" * 200},
    )
    assert response.status_code == 422
