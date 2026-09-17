"""Subscription & Package module — Phase 1 (database layer only)

Adds: member_types, packages, package_member_types, package_services,
member_type_services, members, subscriptions. Adds card_types.credit_cost
(services = card_types + a credit cost, not a separate table — see
app/models/card_type.py's docstring). Adds nullable owner_member_id to
customers/orders/generated_cards for the multi-tenancy groundwork this
module needs later — unused until a later phase's access-control logic
reads it.

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

subscription_status_enum = sa.Enum(
    "pending_approval", "active", "expired", "suspended", "cancelled", name="subscriptionstatus"
)


def upgrade() -> None:
    # ---------- card_types gets a credit cost (services = card_types) ----------
    op.add_column("card_types", sa.Column("credit_cost", sa.Integer, nullable=False, server_default="1"))

    # ---------- member_types ----------
    op.create_table(
        "member_types",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ux_member_types_slug", "member_types", ["slug"], unique=True)

    # ---------- packages ----------
    op.create_table(
        "packages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("credits", sa.Integer, nullable=False),
        sa.Column("license_days", sa.Integer, nullable=False),
        sa.Column("device_limit", sa.Integer, nullable=False, server_default="1"),
        sa.Column("pdf_generation_limit", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ux_packages_slug", "packages", ["slug"], unique=True)

    # ---------- package_member_types (association) ----------
    op.create_table(
        "package_member_types",
        sa.Column("package_id", sa.String(36), sa.ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "member_type_id", sa.String(36), sa.ForeignKey("member_types.id", ondelete="CASCADE"), primary_key=True
        ),
    )

    # ---------- package_services (association to card_types) ----------
    op.create_table(
        "package_services",
        sa.Column("package_id", sa.String(36), sa.ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("card_type_id", sa.String(36), sa.ForeignKey("card_types.id", ondelete="CASCADE"), primary_key=True),
    )

    # ---------- member_type_services (association to card_types) ----------
    op.create_table(
        "member_type_services",
        sa.Column(
            "member_type_id", sa.String(36), sa.ForeignKey("member_types.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("card_type_id", sa.String(36), sa.ForeignKey("card_types.id", ondelete="CASCADE"), primary_key=True),
    )

    # ---------- members ----------
    op.create_table(
        "members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("login_id", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("member_type_id", sa.String(36), sa.ForeignKey("member_types.id"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ux_members_phone", "members", ["phone"], unique=True)
    op.create_index("ux_members_email", "members", ["email"], unique=True)
    op.create_index("ux_members_login_id", "members", ["login_id"], unique=True)
    op.create_index("ix_members_member_type_id", "members", ["member_type_id"])

    # ---------- subscriptions ----------
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("member_id", sa.String(36), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("package_id", sa.String(36), sa.ForeignKey("packages.id"), nullable=False),
        sa.Column("member_type_id", sa.String(36), sa.ForeignKey("member_types.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("expiry_date", sa.Date, nullable=False),
        sa.Column("credits_allocated", sa.Integer, nullable=False),
        sa.Column("credits_remaining", sa.Integer, nullable=False),
        sa.Column("pdf_limit", sa.Integer, nullable=False),
        sa.Column("pdf_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", subscription_status_enum, nullable=False, server_default="pending_approval"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_subscriptions_member_id", "subscriptions", ["member_id"])
    op.create_index("ix_subscriptions_package_id", "subscriptions", ["package_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])

    # ---------- multi-tenancy groundwork (nullable, unused until a later phase) ----------
    op.add_column("customers", sa.Column("owner_member_id", sa.String(36), sa.ForeignKey("members.id"), nullable=True))
    op.create_index("ix_customers_owner_member_id", "customers", ["owner_member_id"])

    op.add_column("orders", sa.Column("owner_member_id", sa.String(36), sa.ForeignKey("members.id"), nullable=True))
    op.create_index("ix_orders_owner_member_id", "orders", ["owner_member_id"])

    op.add_column(
        "generated_cards", sa.Column("owner_member_id", sa.String(36), sa.ForeignKey("members.id"), nullable=True)
    )
    op.create_index("ix_generated_cards_owner_member_id", "generated_cards", ["owner_member_id"])


def downgrade() -> None:
    op.drop_index("ix_generated_cards_owner_member_id", table_name="generated_cards")
    op.drop_column("generated_cards", "owner_member_id")

    op.drop_index("ix_orders_owner_member_id", table_name="orders")
    op.drop_column("orders", "owner_member_id")

    op.drop_index("ix_customers_owner_member_id", table_name="customers")
    op.drop_column("customers", "owner_member_id")

    op.drop_table("subscriptions")
    op.drop_table("members")
    op.drop_table("member_type_services")
    op.drop_table("package_services")
    op.drop_table("package_member_types")
    op.drop_table("packages")
    op.drop_table("member_types")

    op.drop_column("card_types", "credit_cost")

    subscription_status_enum.drop(op.get_bind(), checkfirst=True)
