"""create uploaded_cards

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "uploaded_cards",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("card_type_id", sa.String(length=36), sa.ForeignKey("card_types.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("front_image_path", sa.String(length=500), nullable=False),
        sa.Column("back_image_path", sa.String(length=500), nullable=True),
        sa.Column("width_mm", sa.Float(), nullable=False, server_default="85.60"),
        sa.Column("height_mm", sa.Float(), nullable=False, server_default="53.98"),
        sa.Column("uploaded_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_uploaded_cards_card_type_id", "uploaded_cards", ["card_type_id"])


def downgrade() -> None:
    op.drop_index("ix_uploaded_cards_card_type_id", table_name="uploaded_cards")
    op.drop_table("uploaded_cards")
