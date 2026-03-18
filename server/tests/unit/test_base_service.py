import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.services.user_service import UserRepository
from app.utils.pagination import PaginationParams


class TestUserRepository:
    async def test_create_user(self, db: AsyncSession) -> None:
        repo = UserRepository(db)
        user = await repo.create(
            UserCreate(
                email="new@example.com", first_name="New", last_name="User", password="testpass123"
            )
        )
        assert user.email == "new@example.com"
        assert user.password_hash != "testpass123"  # hashed, not plaintext
        assert user.role == UserRole.USER

    async def test_get_by_id(self, db: AsyncSession, test_user: User) -> None:
        repo = UserRepository(db)
        found = await repo.get_by_id(test_user.id)
        assert found is not None
        assert found.email == test_user.email

    async def test_get_by_id_not_found(self, db: AsyncSession) -> None:
        repo = UserRepository(db)
        found = await repo.get_by_id(uuid.uuid4())
        assert found is None

    async def test_get_by_id_or_raise(self, db: AsyncSession) -> None:
        import pytest

        from app.utils.exceptions import NotFoundError

        repo = UserRepository(db)
        with pytest.raises(NotFoundError):
            await repo.get_by_id_or_raise(uuid.uuid4())

    async def test_list_paginated(
        self, db: AsyncSession, test_user: User, admin_user: User
    ) -> None:
        repo = UserRepository(db)
        result = await repo.list(PaginationParams(page=1, limit=10))
        assert result.total == 2
        assert len(result.items) == 2
        assert result.has_more is False

    async def test_list_pagination_limit(
        self, db: AsyncSession, test_user: User, admin_user: User
    ) -> None:
        repo = UserRepository(db)
        result = await repo.list(PaginationParams(page=1, limit=1))
        assert result.total == 2
        assert len(result.items) == 1
        assert result.has_more is True

    async def test_soft_delete(self, db: AsyncSession, test_user: User) -> None:
        repo = UserRepository(db)
        deleted = await repo.soft_delete(test_user.id)
        assert deleted.is_active is False

    async def test_delete(self, db: AsyncSession, test_user: User) -> None:
        repo = UserRepository(db)
        await repo.delete(test_user.id)
        result = await db.execute(select(User).where(User.id == test_user.id))
        assert result.scalar_one_or_none() is None
