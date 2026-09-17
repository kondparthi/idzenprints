"""create guest_orders and guest_order_items tables (public storefront)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_method_enum = sa.Enum("cod", "phonepe", name="paymentmethod")
payment_status_enum = sa.Enum("pending", "cod_pending", "paid", "failed", "refunded", name="paymentstatus")
guest_order_status_enum = sa.Enum(
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", name="guestorderstatus"
)


def upgrade() -> None:
    op.create_table(
        "guest_orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("order_number", sa.String(20), nullable=False),
        sa.Column("guest_name", sa.String(150), nullable=False),
        sa.Column("guest_phone", sa.String(20), nullable=False),
        sa.Column("guest_email", sa.String(255), nullable=False),
        sa.Column("shipping_address", sa.Text, nullable=False),
        sa.Column("payment_method", payment_method_enum, nullable=False),
        sa.Column("payment_status", payment_status_enum, nullable=False, server_default="pending"),
        sa.Column("payment_reference", sa.String(100), nullable=True),
        sa.Column("status", guest_order_status_enum, nullable=False, server_default="pending"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ux_guest_orders_order_number", "guest_orders", ["order_number"], unique=True)
    op.create_index("ix_guest_orders_status", "guest_orders", ["status"])
    op.create_index("ix_guest_orders_guest_phone", "guest_orders", ["guest_phone"])

    op.create_table(
        "guest_order_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("order_id", sa.String(36), sa.ForeignKey("guest_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("variant_id", sa.String(36), sa.ForeignKey("product_variants.id"), nullable=True),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("variant_label", sa.String(200), nullable=True),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index("ix_guest_order_items_order_id", "guest_order_items", ["order_id"])


def downgrade() -> None:
    op.drop_table("guest_order_items")
    op.drop_table("guest_orders")
    guest_order_status_enum.drop(op.get_bind(), checkfirst=True)
    payment_status_enum.drop(op.get_bind(), checkfirst=True)
    payment_method_enum.drop(op.get_bind(), checkfirst=True)
