"""Generic base repository for CRUD operations.

Inherit from this for any model to get standard operations for free.
"""

import uuid
from typing import Any, Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base
from app.utils.pagination import PaginatedResponse, PaginationParams

ModelT = TypeVar("ModelT", bound=Base)
CreateSchemaT = TypeVar("CreateSchemaT", bound=BaseModel)
UpdateSchemaT = TypeVar("UpdateSchemaT", bound=BaseModel)


class BaseRepository(Generic[ModelT, CreateSchemaT, UpdateSchemaT]):
    """Generic async repository with standard CRUD + pagination."""

    def __init__(self, model: type[ModelT], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: uuid.UUID) -> ModelT | None:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, id: uuid.UUID) -> ModelT:
        from app.utils.exceptions import NotFoundError

        obj = await self.get_by_id(id)
        if obj is None:
            raise NotFoundError(self.model.__name__)
        return obj

    async def list(
        self,
        pagination: PaginationParams,
        *,
        base_query: Select | None = None,
    ) -> PaginatedResponse:
        query = base_query if base_query is not None else select(self.model)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get paginated items
        paginated_query = query.offset(pagination.offset).limit(pagination.limit)
        result = await self.db.execute(paginated_query)
        items = list(result.scalars().all())

        return PaginatedResponse.create(
            items=items,
            total=total,
            page=pagination.page,
            limit=pagination.limit,
        )

    async def create(
        self, data: CreateSchemaT, *, exclude: set[str] | None = None, **extra: Any
    ) -> ModelT:
        dump = data.model_dump(exclude=exclude)
        obj = self.model(**dump, **extra)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, id: uuid.UUID, data: UpdateSchemaT) -> ModelT:
        obj = await self.get_by_id_or_raise(id)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(obj, field, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id: uuid.UUID) -> None:
        obj = await self.get_by_id_or_raise(id)
        await self.db.delete(obj)
        await self.db.flush()

    async def soft_delete(self, id: uuid.UUID) -> ModelT:
        """Soft delete by setting is_active=False. Model must have is_active column."""
        obj = await self.get_by_id_or_raise(id)
        obj.is_active = False  # type: ignore[attr-defined]
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
