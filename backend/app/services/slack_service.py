"""
Slack notification service.
Supports incoming webhooks and Bot API (chat.postMessage) with Block Kit formatting.
"""
import httpx
from typing import Optional
from app.models.incident import Severity, IncidentStatus

SEVERITY_EMOJI = {
    Severity.low: ":large_blue_circle:",
    Severity.medium: ":large_yellow_circle:",
    Severity.high: ":large_orange_circle:",
    Severity.critical: ":red_circle:",
}

SEVERITY_COLOR = {
    Severity.low: "#36a64f",
    Severity.medium: "#f0c929",
    Severity.high: "#e07b39",
    Severity.critical: "#cc0000",
}

STATUS_EMOJI = {
    IncidentStatus.new: ":new:",
    IncidentStatus.active: ":fire:",
    IncidentStatus.stable: ":large_green_circle:",
    IncidentStatus.resolved: ":white_check_mark:",
    IncidentStatus.closed: ":lock:",
}


def _build_incident_blocks(
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> list[dict]:
    sev = Severity(severity) if severity else None
    stat = IncidentStatus(status) if status else None

    header_text = f"{SEVERITY_EMOJI.get(sev, ':bell:')} {title}" if sev else f":bell: {title}"

    blocks: list[dict] = [
        {"type": "header", "text": {"type": "plain_text", "text": header_text, "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": message}},
    ]

    fields = []
    if sev:
        fields.append({"type": "mrkdwn", "text": f"*Severity:*\n{SEVERITY_EMOJI[sev]} {sev.value.upper()}"})
    if stat:
        fields.append({"type": "mrkdwn", "text": f"*Status:*\n{STATUS_EMOJI[stat]} {stat.value.replace('_', ' ').title()}"})
    if tags:
        fields.append({"type": "mrkdwn", "text": f"*Tags:*\n{' '.join(f'`{t}`' for t in tags)}"})
    if incident_id:
        fields.append({"type": "mrkdwn", "text": f"*Incident ID:*\n`{incident_id[:8]}`"})

    if fields:
        blocks.append({"type": "section", "fields": fields})

    if incident_id:
        blocks.append({
            "type": "actions",
            "elements": [{
                "type": "button",
                "text": {"type": "plain_text", "text": "View Incident", "emoji": True},
                "url": f"{base_url}/incidents/{incident_id}",
                "style": "danger" if sev == Severity.critical else "primary",
            }]
        })

    blocks.append({"type": "divider"})
    return blocks


async def send_webhook(
    webhook_url: str,
    title: str,
    message: str,
    channel: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> tuple[bool, Optional[str]]:
    """Send a notification via Slack Incoming Webhook."""
    sev = Severity(severity) if severity else None
    color = SEVERITY_COLOR.get(sev, "#439FE0") if sev else "#439FE0"
    blocks = _build_incident_blocks(title, message, severity, status, incident_id, tags, base_url)

    payload: dict = {"blocks": blocks, "attachments": [{"color": color, "fallback": f"{title}: {message}"}]}
    if channel:
        payload["channel"] = channel

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code == 200 and resp.text == "ok":
                return True, None
            return False, f"Slack returned {resp.status_code}: {resp.text}"
    except Exception as e:
        return False, str(e)


async def send_bot_message(
    bot_token: str,
    channel: str,
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> tuple[bool, Optional[str]]:
    """Send a notification via Slack Bot API (chat.postMessage)."""
    sev = Severity(severity) if severity else None
    color = SEVERITY_COLOR.get(sev, "#439FE0") if sev else "#439FE0"
    blocks = _build_incident_blocks(title, message, severity, status, incident_id, tags, base_url)

    payload = {
        "channel": channel,
        "blocks": blocks,
        "attachments": [{"color": color, "fallback": f"{title}: {message}"}],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                json=payload,
                headers={"Authorization": f"Bearer {bot_token}"},
            )
            data = resp.json()
            if data.get("ok"):
                return True, None
            return False, data.get("error", "Unknown Slack API error")
    except Exception as e:
        return False, str(e)
