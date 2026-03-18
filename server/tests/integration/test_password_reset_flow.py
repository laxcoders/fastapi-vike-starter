"""Integration tests for forgot/reset password flow."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.verification_token import TokenType
from app.services.auth_service import hash_password
from app.services.token_service import create_token


async def test_forgot_password_existing_user(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/auth/forgot-password",
        json={"email": "test@example.com"},
    )
    assert response.status_code == 200
    assert "reset link" in response.json()["message"].lower()


async def test_forgot_password_nonexistent_email(client: AsyncClient) -> None:
    """Should return 200 even if email doesn't exist (anti-enumeration)."""
    response = await client.post(
        "/api/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert "reset link" in response.json()["message"].lower()


async def test_reset_password_success(client: AsyncClient, db: AsyncSession) -> None:
    user = User(
        id=uuid.uuid4(),
        email="reset@example.com",
        first_name="Reset",
        last_name="User",
        password_hash=hash_password("oldpassword"),
        role=UserRole.USER,
        email_verified=True,
    )
    db.add(user)
    await db.flush()

    token_str = await create_token(db, user.id, TokenType.PASSWORD_RESET)
    await db.commit()

    response = await client.post(
        "/api/auth/reset-password",
        json={"token": token_str, "password": "newpassword123"},
    )
    assert response.status_code == 200

    # Should be able to login with new password
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "newpassword123"},
    )
    assert login_resp.status_code == 200


async def test_reset_password_invalid_token(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": "invalid-token", "password": "newpassword123"},
    )
    assert response.status_code == 400


async def test_reset_password_token_single_use(client: AsyncClient, db: AsyncSession) -> None:
    user = User(
        id=uuid.uuid4(),
        email="singleuse@example.com",
        first_name="Single",
        last_name="Use",
        password_hash=hash_password("oldpassword"),
        role=UserRole.USER,
        email_verified=True,
    )
    db.add(user)
    await db.flush()

    token_str = await create_token(db, user.id, TokenType.PASSWORD_RESET)
    await db.commit()

    # First use should work
    response1 = await client.post(
        "/api/auth/reset-password",
        json={"token": token_str, "password": "newpassword1"},
    )
    assert response1.status_code == 200

    # Second use should fail
    response2 = await client.post(
        "/api/auth/reset-password",
        json={"token": token_str, "password": "newpassword2"},
    )
    assert response2.status_code == 400
