"""add back side (back_background_path, back_elements) to templates

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("templates", sa.Column("back_background_path", sa.String(length=500), nullable=True))
    # MySQL doesn't allow a DEFAULT clause on JSON/BLOB/TEXT columns at
    # all (error 1101) — add it nullable first, backfill existing rows,
    # then tighten to NOT NULL, instead of a server_default.
    op.add_column("templates", sa.Column("back_elements", sa.JSON(), nullable=True))
    op.execute("UPDATE templates SET back_elements = '[]' WHERE back_elements IS NULL")
    op.alter_column("templates", "back_elements", existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    op.drop_column("templates", "back_elements")
    op.drop_column("templates", "back_background_path")
