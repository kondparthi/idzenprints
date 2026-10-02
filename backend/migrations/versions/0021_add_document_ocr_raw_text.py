"""add ocr_raw_text to documents

Revision ID: 0021
Revises: 0020
Create Date: 2026-10-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("ocr_raw_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "ocr_raw_text")
