"""split name into first_name and last_name

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-18 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(255), nullable=True))

    # Migrate existing data: split name on first space
    op.execute("""
        UPDATE users SET
            first_name = split_part(name, ' ', 1),
            last_name = CASE
                WHEN position(' ' in name) > 0
                THEN substring(name from position(' ' in name) + 1)
                ELSE ''
            END
    """)

    # Now make them NOT NULL
    op.alter_column("users", "first_name", nullable=False)
    op.alter_column("users", "last_name", nullable=False)

    op.drop_column("users", "name")


def downgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(255), nullable=True))
    op.execute("UPDATE users SET name = first_name || ' ' || last_name")
    op.alter_column("users", "name", nullable=False)
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
