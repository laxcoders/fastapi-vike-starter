"""Edge case tests for auth service — covers missing lines."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.services.auth_service import (
    authenticate_user,
    decode_token,
    get_user_by_id,
    hash_password,
)


class TestDecodeTokenEdges:
    def test_missing_sub_claim_raises(self) -> None:
        """A token without 'sub' should raise ValueError."""
        import jwt

        from app.config import settings

        token = jwt.encode(
            {"type": "access", "exp": 9999999999},
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        with pytest.raises(ValueError, match="missing subject"):
            decode_token(token)


class TestAuthenticateUser:
    async def test_wrong_password(self, db: AsyncSession, test_user: User) -> None:
        result = await authenticate_user(db, "test@example.com", "wrongpassword")
        assert result is None

    async def test_nonexistent_email(self, db: AsyncSession) -> None:
        result = await authenticate_user(db, "nobody@example.com", "whatever")
        assert result is None

    async def test_deactivated_user(self, db: AsyncSession) -> None:
        user = User(
            id=uuid.uuid4(),
            email="inactive@example.com",
            first_name="Inactive",
            last_name="User",
            password_hash=hash_password("testpass123"),
            role=UserRole.USER,
            email_verified=True,
            is_active=False,
        )
        db.add(user)
        await db.commit()

        result = await authenticate_user(db, "inactive@example.com", "testpass123")
        assert result is None


class TestGetUserById:
    async def test_active_user(self, db: AsyncSession, test_user: User) -> None:
        result = await get_user_by_id(db, test_user.id)
        assert result is not None
        assert result.email == test_user.email

    async def test_nonexistent_user(self, db: AsyncSession) -> None:
        result = await get_user_by_id(db, uuid.uuid4())
        assert result is None
