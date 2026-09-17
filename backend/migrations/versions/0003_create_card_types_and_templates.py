"""create card_types and templates tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "card_types",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ux_card_types_name", "card_types", ["name"], unique=True)

    op.create_table(
        "templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("card_type_id", sa.String(36), sa.ForeignKey("card_types.id"), nullable=False),
        sa.Column("width_mm", sa.Float, nullable=False, server_default="85.60"),
        sa.Column("height_mm", sa.Float, nullable=False, server_default="53.98"),
        sa.Column("dpi", sa.Integer, nullable=False, server_default="300"),
        sa.Column("background_path", sa.String(500), nullable=True),
        sa.Column("elements", sa.JSON, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
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
    op.create_index("ix_templates_card_type_id", "templates", ["card_type_id"])

    op.bulk_insert(
        sa.table(
            "card_types",
            sa.column("id", sa.String),
            sa.column("name", sa.String),
            sa.column("description", sa.Text),
            sa.column("is_active", sa.Boolean),
        ),
        [
            {"id": "aadhaar", "name": "Aadhaar PVC", "description": "Aadhaar PVC card", "is_active": True},
            {"id": "fsc", "name": "FSC / Ration Card", "description": None, "is_active": True},
            {"id": "employee_id", "name": "Employee ID", "description": None, "is_active": True},
            {"id": "student_id", "name": "Student ID", "description": None, "is_active": True},
            {"id": "visiting_card", "name": "Visiting Card", "description": None, "is_active": True},
            {"id": "membership_card", "name": "Membership Card", "description": None, "is_active": True},
            {"id": "custom_card", "name": "Custom Card", "description": None, "is_active": True},
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_templates_card_type_id", table_name="templates")
    op.drop_table("templates")

    op.drop_index("ux_card_types_name", table_name="card_types")
    op.drop_table("card_types")
