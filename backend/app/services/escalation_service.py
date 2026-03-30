"""
Background escalation engine.
Runs every 60 seconds, checks all active/new incidents against escalation
policies, and fires notification steps that are past their delay threshold.
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.escalation import EscalationPolicy, EscalationStep, EscalationEvent
from app.models.incident import Incident, IncidentStatus
from app.models.oncall import OnCallSchedule, OnCallEntry
from app.models.notification import Notification, NotificationStatus
from app.services import notification_service

log = logging.getLogger("escalation")

_task: asyncio.Task | None = None


def start_background_task():
    global _task
    _task = asyncio.create_task(_loop())


async def _loop():
    while True:
        try:
            await _run_escalations()
        except Exception:
            log.exception("Escalation loop error")
        await asyncio.sleep(60)


async def _run_escalations():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Load all active policies with their steps
        policies_result = await db.execute(
            select(EscalationPolicy)
            .options(selectinload(EscalationPolicy.steps))
            .where(EscalationPolicy.is_active == True)
        )
        policies = policies_result.scalars().all()
        if not policies:
            return

        # Load open incidents (new or active — not yet resolved/stable/closed)
        incidents_result = await db.execute(
            select(Incident).where(
                Incident.status.in_([IncidentStatus.new, IncidentStatus.active])
            )
        )
        incidents = incidents_result.scalars().all()
        if not incidents:
            return

        for incident in incidents:
            elapsed_minutes = (now - incident.created_at).total_seconds() / 60

            for policy in policies:
                # Policy must match: either global or same service
                if policy.service_id and policy.service_id != incident.service_id:
                    continue

                for step in policy.steps:
                    if elapsed_minutes < step.delay_minutes:
                        continue  # not yet due

                    # Check if already fired
                    fired = await db.execute(
                        select(EscalationEvent).where(
                            EscalationEvent.incident_id == incident.id,
                            EscalationEvent.policy_id == policy.id,
                            EscalationEvent.step_order == step.step_order,
                        )
                    )
                    if fired.scalar_one_or_none():
                        continue  # already done

                    await _fire_step(db, incident, policy, step, now)


async def _fire_step(db, incident: Incident, policy: EscalationPolicy, step: EscalationStep, now: datetime):
    title = f"Escalation — {incident.title}"
    message = (
        step.message_template
        or f"Incident has been {incident.status.value} for "
           f"{int((now - incident.created_at).total_seconds() // 60)} minutes with no resolution. "
           f"Escalating to next responder. (Policy: {policy.name}, Step {step.step_order})"
    )

    log.info("Firing escalation step %d for incident %s", step.step_order, incident.id)

    # 1. Notify configured channels
    for channel_id in (step.notify_channel_ids or []):
        from app.models.channel import NotificationChannel
        ch_result = await db.execute(
            select(NotificationChannel).where(
                NotificationChannel.id == channel_id,
                NotificationChannel.is_active == True,
            )
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            continue

        ok, error = await notification_service._send_to_channel(
            channel=channel,
            title=title,
            message=message,
            severity=incident.severity.value,
            status=incident.status.value,
            incident_id=incident.id,
            tags=(incident.tags or []) + ["escalation"],
        )
        notif = Notification(
            topic=incident.topic or "escalation",
            title=title,
            message=message,
            priority="urgent",
            incident_id=incident.id,
            channel_id=channel_id,
            status=NotificationStatus.sent if ok else NotificationStatus.failed,
            error=error,
            sent_at=now if ok else None,
        )
        db.add(notif)

    # 2. Page the secondary on-call if requested
    if step.notify_oncall_secondary and incident.service_id:
        secondary_result = await db.execute(
            select(OnCallEntry)
            .join(OnCallSchedule, OnCallEntry.schedule_id == OnCallSchedule.id)
            .where(
                OnCallSchedule.service_id == incident.service_id,
                OnCallSchedule.is_active == True,
                OnCallEntry.role == "secondary",
                OnCallEntry.start_at <= now,
                OnCallEntry.end_at >= now,
            )
            .limit(1)
        )
        secondary = secondary_result.scalar_one_or_none()
        if secondary:
            log.info("Paging secondary on-call user %s", secondary.user_id)
            # Publish SSE event directly to user (they can subscribe to their user topic)
            from app.services.pubsub import publish
            await publish(f"user:{secondary.user_id}", {
                "type": "escalation",
                "title": title,
                "message": message,
                "incident_id": incident.id,
                "severity": incident.severity.value,
            })

    # Record the event so we don't fire again
    db.add(EscalationEvent(
        incident_id=incident.id,
        policy_id=policy.id,
        step_order=step.step_order,
        triggered_at=now,
    ))
    await db.commit()
