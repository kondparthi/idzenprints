"""create generated_cards table

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "generated_cards",
        sa.Column("id", sa.String(36), primary_key=True),
        # No FK yet — the orders table doesn't exist until Phase 5.
        sa.Column("order_id", sa.String(36), nullable=True),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("templates.id"), nullable=False),
        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("png_path", sa.String(500), nullable=True),
        sa.Column("jpg_path", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_generated_cards_customer_id", "generated_cards", ["customer_id"])
    op.create_index("ix_generated_cards_template_id", "generated_cards", ["template_id"])


def downgrade() -> None:
    op.drop_index("ix_generated_cards_template_id", table_name="generated_cards")
    op.drop_index("ix_generated_cards_customer_id", table_name="generated_cards")
    op.drop_table("generated_cards")
