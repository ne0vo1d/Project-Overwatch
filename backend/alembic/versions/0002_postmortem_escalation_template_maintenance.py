"""Add postmortem, escalation, template, and maintenance tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "postmortems",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("incident_id", sa.String(), sa.ForeignKey("incidents.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("incident_id"),
    )

    op.create_table(
        "escalation_policies",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("service_id", sa.String(), sa.ForeignKey("services.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "escalation_steps",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("policy_id", sa.String(), sa.ForeignKey("escalation_policies.id"), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("delay_minutes", sa.Integer(), nullable=False),
        sa.Column("notify_channel_ids", JSON(), nullable=False, server_default="[]"),
        sa.Column("notify_oncall_secondary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("message_template", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "escalation_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("incident_id", sa.String(), sa.ForeignKey("incidents.id"), nullable=False),
        sa.Column("policy_id", sa.String(), sa.ForeignKey("escalation_policies.id"), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "incident_templates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("incident_title_template", sa.String(), nullable=True),
        sa.Column("incident_description_template", sa.Text(), nullable=True),
        sa.Column("severity", sa.Enum("low", "medium", "high", "critical", name="severity"), nullable=False),
        sa.Column("tags", JSON(), nullable=False, server_default="[]"),
        sa.Column("topic", sa.String(), nullable=True),
        sa.Column("service_id", sa.String(), sa.ForeignKey("services.id"), nullable=True),
        sa.Column("runbook_url", sa.String(), nullable=True),
        sa.Column("tasks", JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "maintenance_windows",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("service_ids", JSON(), nullable=False, server_default="[]"),
        sa.Column("topics", JSON(), nullable=False, server_default="[]"),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("maintenance_windows")
    op.drop_table("incident_templates")
    op.drop_table("escalation_events")
    op.drop_table("escalation_steps")
    op.drop_table("escalation_policies")
    op.drop_table("postmortems")
