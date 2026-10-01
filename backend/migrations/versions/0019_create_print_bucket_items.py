"""create print_bucket_items

Revision ID: 0019
Revises: 0018
Create Date: 2026-10-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "print_bucket_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("generated_card_id", sa.String(length=36), sa.ForeignKey("generated_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("generated_card_id", name="uq_print_bucket_items_generated_card_id"),
    )
    op.create_index("ix_print_bucket_items_generated_card_id", "print_bucket_items", ["generated_card_id"])


def downgrade() -> None:
    op.drop_index("ix_print_bucket_items_generated_card_id", table_name="print_bucket_items")
    op.drop_table("print_bucket_items")
