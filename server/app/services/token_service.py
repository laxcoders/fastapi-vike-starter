"""Verification token service for email verification and password reset."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.verification_token import TokenType, VerificationToken


async def create_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    token_type: TokenType,
) -> str:
    """Create a verification token and store it in the database."""
    if token_type == TokenType.EMAIL_VERIFICATION:
        expire_hours = settings.verification_token_expire_hours
    else:
        expire_hours = settings.password_reset_token_expire_hours

    token_str = secrets.token_urlsafe(32)
    token = VerificationToken(
        user_id=user_id,
        token=token_str,
        type=token_type,
        expires_at=datetime.now(UTC) + timedelta(hours=expire_hours),
    )
    db.add(token)
    await db.flush()
    return token_str


async def consume_token(
    db: AsyncSession,
    token_str: str,
    token_type: TokenType,
) -> VerificationToken | None:
    """Atomically delete a valid token and return it. Single-use and race-safe."""
    # SELECT ... WITH FOR UPDATE to lock the row, then delete.
    # This prevents two concurrent requests from both consuming the same token.
    result = await db.execute(
        select(VerificationToken)
        .where(
            VerificationToken.token == token_str,
            VerificationToken.type == token_type,
            VerificationToken.expires_at > datetime.now(UTC),
        )
        .with_for_update()
    )
    token = result.scalar_one_or_none()
    if token is None:
        return None

    await db.delete(token)
    await db.flush()
    return token


async def delete_expired_tokens(db: AsyncSession) -> int:
    """Remove all expired tokens. Returns the number deleted."""
    result = await db.execute(
        delete(VerificationToken).where(VerificationToken.expires_at <= datetime.now(UTC))
    )
    return result.rowcount or 0  # type: ignore[attr-defined, return-value]
