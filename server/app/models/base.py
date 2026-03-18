import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


def pg_enum(enum_class: type[enum.StrEnum], name: str) -> Enum:
    """Create a SQLAlchemy Enum that uses lowercase values for Postgres compatibility.

    Always use this instead of Enum() directly to avoid the uppercase/lowercase
    mismatch between Python enum names and Postgres enum values.
    """
    return Enum(enum_class, name=name, values_callable=lambda e: [x.value for x in e])


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
