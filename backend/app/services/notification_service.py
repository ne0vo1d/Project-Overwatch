"""
Notification dispatch service.
Routes notifications to all matching channels (Slack, Teams, webhooks, ntfy)
and publishes to the SSE pub/sub broker.
"""
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.channel import NotificationChannel, ChannelType
from app.models.notification import Notification, NotificationStatus
from app.services import slack_service, teams_service, email_service
from app.services.pubsub import publish
from app.config import settings


async def dispatch(
    db: AsyncSession,
    topic: str,
    title: str,
    message: str,
    priority: str = "default",
    tags: list[str] | None = None,
    incident_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
) -> list[Notification]:
    """
    1. Publish to SSE pub/sub (instant, in-memory)
    2. Find all active channels matching the topic and severity
    3. Dispatch to each channel and record the result
    """
    # Always publish to SSE broker
    await publish(topic, {
        "type": "notification",
        "topic": topic,
        "title": title,
        "message": message,
        "priority": priority,
        "tags": tags or [],
        "incident_id": incident_id,
        "severity": severity,
        "status": status,
    })

    # Find matching channels
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.is_active == True)
    )
    channels = result.scalars().all()

    records: list[Notification] = []
    for channel in channels:
        if not _channel_matches(channel, topic, severity):
            continue

        notif = Notification(
            topic=topic,
            title=title,
            message=message,
            priority=priority,
            tags=tags,
            incident_id=incident_id,
            channel_id=channel.id,
            status=NotificationStatus.pending,
        )
        db.add(notif)
        await db.flush()

        ok, error = await _send_to_channel(channel, title, message, severity, status, incident_id, tags or [])

        notif.status = NotificationStatus.sent if ok else NotificationStatus.failed
        notif.error = error
        notif.sent_at = datetime.now(timezone.utc) if ok else None
        records.append(notif)

    await db.commit()
    return records


def _channel_matches(channel: NotificationChannel, topic: str, severity: str | None) -> bool:
    if channel.topics and topic not in channel.topics:
        return False
    if channel.severities and severity and severity not in channel.severities:
        return False
    return True


async def _send_to_channel(
    channel: NotificationChannel,
    title: str,
    message: str,
    severity: str | None,
    status: str | None,
    incident_id: str | None,
    tags: list[str],
) -> tuple[bool, str | None]:
    cfg = channel.config
    base_url = cfg.get("base_url", "http://localhost:3000")

    if channel.type == ChannelType.slack:
        webhook_url = cfg.get("webhook_url")
        bot_token = cfg.get("bot_token")
        slack_channel = cfg.get("channel", "#incidents")

        if bot_token and slack_channel:
            return await slack_service.send_bot_message(
                bot_token=bot_token,
                channel=slack_channel,
                title=title,
                message=message,
                severity=severity,
                status=status,
                incident_id=incident_id,
                tags=tags,
                base_url=base_url,
            )
        elif webhook_url:
            return await slack_service.send_webhook(
                webhook_url=webhook_url,
                title=title,
                message=message,
                channel=slack_channel if slack_channel else None,
                severity=severity,
                status=status,
                incident_id=incident_id,
                tags=tags,
                base_url=base_url,
            )
        return False, "Slack channel missing webhook_url or bot_token"

    elif channel.type == ChannelType.teams:
        webhook_url = cfg.get("webhook_url")
        if not webhook_url:
            return False, "Teams channel missing webhook_url"
        use_adaptive = cfg.get("use_adaptive_card", True)
        return await teams_service.send_webhook(
            webhook_url=webhook_url,
            title=title,
            message=message,
            severity=severity,
            status=status,
            incident_id=incident_id,
            tags=tags,
            base_url=base_url,
            use_adaptive_card=use_adaptive,
        )

    elif channel.type == ChannelType.webhook:
        return await _send_generic_webhook(cfg, title, message, severity, status, incident_id, tags)

    elif channel.type == ChannelType.ntfy:
        return await _send_ntfy(cfg, title, message, tags)

    elif channel.type == ChannelType.email:
        return await _send_email(cfg, title, message, severity, status, incident_id, tags, base_url)

    return False, f"Unknown channel type: {channel.type}"


async def _send_generic_webhook(
    cfg: dict,
    title: str,
    message: str,
    severity: str | None,
    status: str | None,
    incident_id: str | None,
    tags: list[str],
) -> tuple[bool, str | None]:
    url = cfg.get("url")
    if not url:
        return False, "Webhook channel missing url"

    headers = cfg.get("headers", {})
    secret = cfg.get("secret")
    if secret:
        headers["X-Overwatch-Secret"] = secret

    payload = {
        "title": title,
        "message": message,
        "severity": severity,
        "status": status,
        "incident_id": incident_id,
        "tags": tags,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.is_success:
                return True, None
            return False, f"Webhook returned {resp.status_code}"
    except Exception as e:
        return False, str(e)


async def _send_email(
    cfg: dict,
    title: str,
    message: str,
    severity: str | None,
    status: str | None,
    incident_id: str | None,
    tags: list[str],
    base_url: str,
) -> tuple[bool, str | None]:
    api_key = cfg.get("api_key")
    if not api_key:
        return False, "Email channel missing api_key"
    to_emails = cfg.get("to_emails", [])
    if not to_emails:
        return False, "Email channel missing to_emails"
    from_email = cfg.get("from_email", "overwatch@example.com")
    from_name = cfg.get("from_name", "Project Overwatch")
    return await email_service.send_email(
        api_key=api_key,
        to_emails=to_emails,
        from_email=from_email,
        from_name=from_name,
        title=title,
        message=message,
        severity=severity,
        status=status,
        incident_id=incident_id,
        tags=tags,
        base_url=base_url,
    )


async def _send_ntfy(
    cfg: dict,
    title: str,
    message: str,
    tags: list[str],
) -> tuple[bool, str | None]:
    base_url = cfg.get("base_url", settings.ntfy_base_url)
    topic = cfg.get("topic")
    token = cfg.get("token") or settings.ntfy_token

    if not topic:
        return False, "ntfy channel missing topic"

    headers: dict[str, str] = {"Title": title}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if tags:
        headers["Tags"] = ",".join(tags)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{base_url}/{topic}", content=message, headers=headers)
            if resp.is_success:
                return True, None
            return False, f"ntfy returned {resp.status_code}: {resp.text}"
    except Exception as e:
        return False, str(e)
