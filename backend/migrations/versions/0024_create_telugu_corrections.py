"""create telugu_corrections

Revision ID: 0024
Revises: 0023
Create Date: 2026-10-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telugu_corrections",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("english_word", sa.String(length=120), nullable=False),
        sa.Column("telugu_word", sa.String(length=240), nullable=False),
        sa.Column("times_used", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_telugu_corrections_english_word", "telugu_corrections", ["english_word"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_telugu_corrections_english_word", table_name="telugu_corrections")
    op.drop_table("telugu_corrections")
