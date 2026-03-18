"""Tests for verification token service."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.verification_token import TokenType, VerificationToken
from app.services.token_service import consume_token, create_token, delete_expired_tokens


class TestCreateToken:
    async def test_creates_token_string(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        assert isinstance(token_str, str)
        assert len(token_str) > 20

    async def test_creates_password_reset_token(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.PASSWORD_RESET)
        assert isinstance(token_str, str)


class TestConsumeToken:
    async def test_consumes_valid_token(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        result = await consume_token(db, token_str, TokenType.EMAIL_VERIFICATION)
        assert result is not None
        assert result.user_id == test_user.id

    async def test_returns_none_for_invalid_token(self, db: AsyncSession) -> None:
        result = await consume_token(db, "nonexistent", TokenType.EMAIL_VERIFICATION)
        assert result is None

    async def test_returns_none_for_wrong_type(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        result = await consume_token(db, token_str, TokenType.PASSWORD_RESET)
        assert result is None

    async def test_returns_none_for_expired_token(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        # Manually expire the token
        from sqlalchemy import select

        result = await db.execute(
            select(VerificationToken).where(VerificationToken.token == token_str)
        )
        token_obj = result.scalar_one()
        token_obj.expires_at = datetime.now(UTC) - timedelta(hours=1)
        await db.flush()

        result = await consume_token(db, token_str, TokenType.EMAIL_VERIFICATION)
        assert result is None

    async def test_single_use(self, db: AsyncSession, test_user: User) -> None:
        token_str = await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        first = await consume_token(db, token_str, TokenType.EMAIL_VERIFICATION)
        assert first is not None
        second = await consume_token(db, token_str, TokenType.EMAIL_VERIFICATION)
        assert second is None


class TestDeleteExpiredTokens:
    async def test_deletes_expired(self, db: AsyncSession, test_user: User) -> None:
        # Create an expired token manually
        expired = VerificationToken(
            user_id=test_user.id,
            token="expired-token",
            type=TokenType.EMAIL_VERIFICATION,
            expires_at=datetime.now(UTC) - timedelta(hours=1),
        )
        db.add(expired)
        await db.flush()

        count = await delete_expired_tokens(db)
        assert count == 1

    async def test_keeps_valid_tokens(self, db: AsyncSession, test_user: User) -> None:
        await create_token(db, test_user.id, TokenType.EMAIL_VERIFICATION)
        count = await delete_expired_tokens(db)
        assert count == 0
