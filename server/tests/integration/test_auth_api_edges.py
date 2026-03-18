"""Edge cases for auth API — covers the gaps in auth.py and dependencies.py."""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.services.auth_service import create_access_token, create_refresh_token, hash_password


async def test_refresh_with_access_token_rejected(client: AsyncClient, test_user: User) -> None:
    """Using an access token as a refresh token should fail."""
    access_token = create_access_token(test_user.id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert response.status_code == 401
    assert "Invalid token type" in response.json()["detail"]


async def test_refresh_with_deactivated_user(client: AsyncClient, db: AsyncSession) -> None:
    """Refreshing a token for a deactivated user should fail."""
    user = User(
        id=uuid.uuid4(),
        email="deactivated@example.com",
        first_name="Deactivated",
        last_name="User",
        password_hash=hash_password("testpass123"),
        role=UserRole.USER,
        email_verified=True,
        is_active=False,
    )
    db.add(user)
    await db.commit()

    refresh_token = create_refresh_token(user.id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 401
    assert "not found or deactivated" in response.json()["detail"]


async def test_refresh_with_nonexistent_user(client: AsyncClient) -> None:
    """Refreshing with a valid JWT but unknown user ID should fail."""
    fake_id = uuid.uuid4()
    refresh_token = create_refresh_token(fake_id)
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 401


async def test_access_token_with_wrong_type(client: AsyncClient, test_user: User) -> None:
    """Using a refresh token as an access token should fail."""
    refresh_token = create_refresh_token(test_user.id)
    response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response.status_code == 401
    assert "Invalid token type" in response.json()["detail"]
