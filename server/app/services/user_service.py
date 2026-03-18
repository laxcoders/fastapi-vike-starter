"""User repository — example of extending BaseRepository."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import hash_password
from app.services.base_service import BaseRepository


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def create(self, data: UserCreate, **extra: Any) -> User:  # type: ignore[override]
        return await super().create(
            data,
            exclude={"password"},
            password_hash=hash_password(data.password),
        )
