"""Integration tests for registration and email verification flow."""

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.verification_token import TokenType
from app.services.auth_service import hash_password
from app.services.token_service import create_token


async def test_register_success(client: AsyncClient, db: AsyncSession) -> None:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["requires_verification"] is True

    # User should exist but not be verified
    result = await db.execute(select(User).where(User.email == "new@example.com"))
    user = result.scalar_one()
    assert user.email_verified is False
    assert user.role == UserRole.USER


async def test_register_duplicate_email(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "first_name": "Dup",
            "last_name": "User",
            "password": "password123",
        },
    )
    assert response.status_code == 409


async def test_register_short_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "short",
        },
    )
    assert response.status_code == 422


async def test_verify_email_success(client: AsyncClient, db: AsyncSession) -> None:
    # Create an unverified user
    user = User(
        id=uuid.uuid4(),
        email="unverified@example.com",
        first_name="Unverified",
        last_name="User",
        password_hash=hash_password("password123"),
        role=UserRole.USER,
        email_verified=False,
    )
    db.add(user)
    await db.flush()

    token_str = await create_token(db, user.id, TokenType.EMAIL_VERIFICATION)
    await db.commit()

    response = await client.post(
        "/api/auth/verify-email",
        json={"token": token_str},
    )
    assert response.status_code == 200

    # User should now be verified
    await db.refresh(user)
    assert user.email_verified is True


async def test_verify_email_invalid_token(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/verify-email",
        json={"token": "invalid-token"},
    )
    assert response.status_code == 400


async def test_login_blocked_when_unverified(client: AsyncClient, db: AsyncSession) -> None:
    user = User(
        id=uuid.uuid4(),
        email="noverify@example.com",
        first_name="No",
        last_name="Verify",
        password_hash=hash_password("password123"),
        role=UserRole.USER,
        email_verified=False,
    )
    db.add(user)
    await db.commit()

    response = await client.post(
        "/api/auth/login",
        json={"email": "noverify@example.com", "password": "password123"},
    )
    assert response.status_code == 403
    assert "verify your email" in response.json()["detail"].lower()


async def test_login_works_when_verified(client: AsyncClient, test_user: User) -> None:
    # test_user fixture has email_verified=True
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
