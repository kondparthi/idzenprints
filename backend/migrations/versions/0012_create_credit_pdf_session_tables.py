"""create credit_transactions, pdf_usage, member_sessions tables

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

credit_txn_type_enum = sa.Enum("credit", "debit", "refund", "adjustment", "expiry", name="credittransactiontype")
session_status_enum = sa.Enum("active", "logged_out", "revoked", name="sessionstatus")


def upgrade() -> None:
    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("subscription_id", sa.String(36), sa.ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_type", credit_txn_type_enum, nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("balance_after", sa.Integer, nullable=False),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.String(36), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_credit_transactions_subscription_id", "credit_transactions", ["subscription_id"])

    op.create_table(
        "pdf_usage",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("subscription_id", sa.String(36), sa.ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.String(36), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("card_type_id", sa.String(36), sa.ForeignKey("card_types.id"), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pdf_usage_subscription_id", "pdf_usage", ["subscription_id"])

    op.create_table(
        "member_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("member_id", sa.String(36), sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(100), nullable=False),
        sa.Column("device_name", sa.String(150), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("login_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("logout_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", session_status_enum, nullable=False, server_default="active"),
    )
    op.create_index("ix_member_sessions_member_id", "member_sessions", ["member_id"])


def downgrade() -> None:
    op.drop_table("member_sessions")
    op.drop_table("pdf_usage")
    op.drop_table("credit_transactions")
    session_status_enum.drop(op.get_bind(), checkfirst=True)
    credit_txn_type_enum.drop(op.get_bind(), checkfirst=True)
