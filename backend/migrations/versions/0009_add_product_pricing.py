"""add pricing fields to products/variants; create customer-price and bulk-pricing tables

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

tax_status_enum = sa.Enum("taxable", "shipping_only", "none", name="taxstatus")
tax_class_enum = sa.Enum("standard", "reduced_rate", "zero_rate", name="taxclass")


def _pricing_columns():
    return [
        sa.Column("regular_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("sale_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("sale_start_date", sa.Date, nullable=True),
        sa.Column("sale_end_date", sa.Date, nullable=True),
        sa.Column("cost_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("tax_status", tax_status_enum, nullable=False, server_default="taxable"),
        sa.Column("tax_class", tax_class_enum, nullable=False, server_default="standard"),
        sa.Column("min_quantity", sa.Integer, nullable=True),
        sa.Column("max_quantity", sa.Integer, nullable=True),
    ]


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        for col in _pricing_columns():
            batch_op.add_column(col)

    with op.batch_alter_table("product_variants") as batch_op:
        for col in _pricing_columns():
            batch_op.add_column(col)

    op.create_table(
        "product_customer_prices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("product_id", "customer_id", name="ux_product_customer_price"),
    )
    op.create_index("ix_product_customer_prices_product_id", "product_customer_prices", ["product_id"])
    op.create_index("ix_product_customer_prices_customer_id", "product_customer_prices", ["customer_id"])

    op.create_table(
        "product_bulk_pricing_tiers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("min_quantity", sa.Integer, nullable=False),
        sa.Column("max_quantity", sa.Integer, nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_product_bulk_pricing_tiers_product_id", "product_bulk_pricing_tiers", ["product_id"])


def downgrade() -> None:
    op.drop_table("product_bulk_pricing_tiers")
    op.drop_table("product_customer_prices")

    with op.batch_alter_table("product_variants") as batch_op:
        for col in ["max_quantity", "min_quantity", "tax_class", "tax_status", "cost_price", "sale_end_date", "sale_start_date", "sale_price", "regular_price"]:
            batch_op.drop_column(col)

    with op.batch_alter_table("products") as batch_op:
        for col in ["max_quantity", "min_quantity", "tax_class", "tax_status", "cost_price", "sale_end_date", "sale_start_date", "sale_price", "regular_price"]:
            batch_op.drop_column(col)

    tax_class_enum.drop(op.get_bind(), checkfirst=True)
    tax_status_enum.drop(op.get_bind(), checkfirst=True)
