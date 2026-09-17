"""add inventory/stock fields to products/variants; create inventory_adjustments table

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

stock_status_enum = sa.Enum("in_stock", "out_of_stock", "on_backorder", name="stockstatus")
backorders_enum = sa.Enum("no", "notify", "yes", name="backorders")


def _inventory_columns():
    return [
        sa.Column("manage_stock", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("stock_quantity", sa.Integer, nullable=True),
        sa.Column("stock_status", stock_status_enum, nullable=False, server_default="in_stock"),
        sa.Column("low_stock_threshold", sa.Integer, nullable=True),
        sa.Column("backorders", backorders_enum, nullable=False, server_default="no"),
    ]


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        for col in _inventory_columns():
            batch_op.add_column(col)

    with op.batch_alter_table("product_variants") as batch_op:
        for col in _inventory_columns():
            batch_op.add_column(col)

    op.create_table(
        "inventory_adjustments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "variant_id", sa.String(36), sa.ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True
        ),
        sa.Column("previous_quantity", sa.Integer, nullable=False),
        sa.Column("new_quantity", sa.Integer, nullable=False),
        sa.Column("change_quantity", sa.Integer, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("adjusted_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_inventory_adjustments_product_id", "inventory_adjustments", ["product_id"])
    op.create_index("ix_inventory_adjustments_variant_id", "inventory_adjustments", ["variant_id"])


def downgrade() -> None:
    op.drop_table("inventory_adjustments")

    with op.batch_alter_table("product_variants") as batch_op:
        for col in ["backorders", "low_stock_threshold", "stock_status", "stock_quantity", "manage_stock"]:
            batch_op.drop_column(col)

    with op.batch_alter_table("products") as batch_op:
        for col in ["backorders", "low_stock_threshold", "stock_status", "stock_quantity", "manage_stock"]:
            batch_op.drop_column(col)

    backorders_enum.drop(op.get_bind(), checkfirst=True)
    stock_status_enum.drop(op.get_bind(), checkfirst=True)
