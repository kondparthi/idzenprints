"""add back_png_path/back_jpg_path to generated_cards

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("generated_cards", sa.Column("back_png_path", sa.String(length=500), nullable=True))
    op.add_column("generated_cards", sa.Column("back_jpg_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("generated_cards", "back_jpg_path")
    op.drop_column("generated_cards", "back_png_path")
