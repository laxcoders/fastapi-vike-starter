"""Tests for BaseRepository update and delete paths."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdate
from app.services.user_service import UserRepository


class TestUpdate:
    async def test_update_user_name(self, db: AsyncSession, test_user: User) -> None:
        repo = UserRepository(db)
        updated = await repo.update(test_user.id, UserUpdate(first_name="Updated"))
        assert updated.first_name == "Updated"
        assert updated.email == test_user.email  # unchanged

    async def test_update_partial(self, db: AsyncSession, test_user: User) -> None:
        repo = UserRepository(db)
        updated = await repo.update(test_user.id, UserUpdate(is_active=False))
        assert updated.is_active is False
        assert updated.first_name == test_user.first_name  # unchanged

    async def test_update_nonexistent_raises(self, db: AsyncSession) -> None:
        import pytest

        from app.utils.exceptions import NotFoundError

        repo = UserRepository(db)
        with pytest.raises(NotFoundError):
            await repo.update(uuid.uuid4(), UserUpdate(first_name="X"))
