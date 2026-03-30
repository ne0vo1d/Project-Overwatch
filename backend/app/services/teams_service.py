"""
Microsoft Teams notification service.
Supports Incoming Webhooks with Adaptive Cards (new) and MessageCard (legacy).
"""
import httpx
from typing import Optional
from app.models.incident import Severity, IncidentStatus

SEVERITY_COLOR = {
    Severity.low: "Good",       # green
    Severity.medium: "Warning",  # yellow
    Severity.high: "Attention",  # orange/red
    Severity.critical: "Attention",
}

SEVERITY_HEX = {
    Severity.low: "36a64f",
    Severity.medium: "f0c929",
    Severity.high: "e07b39",
    Severity.critical: "cc0000",
}

STATUS_ICON = {
    IncidentStatus.new: "🆕",
    IncidentStatus.active: "🔥",
    IncidentStatus.stable: "🟢",
    IncidentStatus.resolved: "✅",
    IncidentStatus.closed: "🔒",
}


def _build_adaptive_card(
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> dict:
    """Build an Adaptive Card payload for Teams webhooks."""
    sev = Severity(severity) if severity else None
    stat = IncidentStatus(status) if status else None
    color = SEVERITY_COLOR.get(sev, "Accent") if sev else "Accent"
    hex_color = SEVERITY_HEX.get(sev, "0078D4") if sev else "0078D4"

    facts = []
    if sev:
        facts.append({"title": "Severity", "value": sev.value.upper()})
    if stat:
        icon = STATUS_ICON.get(stat, "")
        facts.append({"title": "Status", "value": f"{icon} {stat.value.replace('_', ' ').title()}"})
    if incident_id:
        facts.append({"title": "Incident ID", "value": incident_id[:8]})
    if tags:
        facts.append({"title": "Tags", "value": ", ".join(tags)})

    body: list[dict] = [
        {
            "type": "TextBlock",
            "size": "Large",
            "weight": "Bolder",
            "text": title,
            "color": color,
            "wrap": True,
        },
        {
            "type": "TextBlock",
            "text": message,
            "wrap": True,
        },
    ]

    if facts:
        body.append({
            "type": "FactSet",
            "facts": facts,
        })

    actions = []
    if incident_id:
        actions.append({
            "type": "Action.OpenUrl",
            "title": "View Incident",
            "url": f"{base_url}/incidents/{incident_id}",
        })

    card: dict = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": None,
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": body,
                **({"actions": actions} if actions else {}),
                "msteams": {"width": "Full"},
            },
        }],
    }

    # Add accent color via legacy msteams extension
    card["attachments"][0]["content"]["msTeams"] = {"color": f"#{hex_color}"}
    return card


def _build_message_card(
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> dict:
    """Build a legacy MessageCard payload (O365 Connector) for older Teams webhooks."""
    sev = Severity(severity) if severity else None
    stat = IncidentStatus(status) if status else None
    hex_color = SEVERITY_HEX.get(sev, "0078D4") if sev else "0078D4"

    facts = []
    if sev:
        facts.append({"name": "Severity", "value": sev.value.upper()})
    if stat:
        icon = STATUS_ICON.get(stat, "")
        facts.append({"name": "Status", "value": f"{icon} {stat.value.replace('_', ' ').title()}"})
    if incident_id:
        facts.append({"name": "Incident ID", "value": incident_id[:8]})
    if tags:
        facts.append({"name": "Tags", "value": ", ".join(tags)})

    card: dict = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": hex_color,
        "summary": title,
        "sections": [{"activityTitle": title, "activityText": message, "facts": facts, "markdown": True}],
    }

    if incident_id:
        card["potentialAction"] = [{
            "@type": "OpenUri",
            "name": "View Incident",
            "targets": [{"os": "default", "uri": f"{base_url}/incidents/{incident_id}"}],
        }]

    return card


async def send_webhook(
    webhook_url: str,
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
    use_adaptive_card: bool = True,
) -> tuple[bool, Optional[str]]:
    """Send a notification via Teams Incoming Webhook."""
    if use_adaptive_card:
        payload = _build_adaptive_card(title, message, severity, status, incident_id, tags, base_url)
    else:
        payload = _build_message_card(title, message, severity, status, incident_id, tags, base_url)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            # Teams webhooks return 1 on success for MessageCard, or 202 for Adaptive Cards
            if resp.status_code in (200, 202) or resp.text.strip() in ("1", ""):
                return True, None
            return False, f"Teams returned {resp.status_code}: {resp.text}"
    except Exception as e:
        return False, str(e)
