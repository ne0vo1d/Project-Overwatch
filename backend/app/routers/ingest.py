"""
Inbound alert ingestion — parse payloads from monitoring systems
and auto-create (or resolve) incidents.

Endpoints:
  POST /ingest/grafana        — Grafana Alerting webhook
  POST /ingest/datadog        — Datadog Webhooks integration
  POST /ingest/alertmanager   — Prometheus Alertmanager webhook receiver
  POST /ingest/generic        — Simple key-value payload
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hashlib
import hmac

from app.database import get_db
from app.models.incident import Incident, IncidentStatus, Severity
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services import incident_service
from app.config import settings

router = APIRouter(prefix="/ingest", tags=["ingest"])

# Map alert source severities → our Severity enum
_GRAFANA_STATE_MAP = {
    "alerting": (IncidentStatus.active, Severity.high),
    "pending": (IncidentStatus.new, Severity.medium),
    "ok": (IncidentStatus.resolved, None),
    "no_data": (IncidentStatus.new, Severity.low),
    "paused": (IncidentStatus.stable, None),
}

_DATADOG_ALERT_MAP = {
    "error": Severity.critical,
    "warning": Severity.high,
    "info": Severity.medium,
    "success": Severity.low,
}

_AM_SEVERITY_MAP = {
    "critical": Severity.critical,
    "high": Severity.high,
    "warning": Severity.medium,
    "info": Severity.low,
}


async def _get_system_user(db: AsyncSession) -> User:
    """Return the first admin user to act as incident creator for ingest events."""
    result = await db.execute(select(User).where(User.is_admin == True).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=503, detail="No users in system — create an account first.")
    return user


async def _find_open_incident(db: AsyncSession, fingerprint: str) -> Incident | None:
    """Look for an existing open incident with a matching fingerprint tag."""
    result = await db.execute(
        select(Incident).where(
            Incident.tags.contains([fingerprint]),
            Incident.status.not_in([IncidentStatus.resolved, IncidentStatus.closed]),
        ).limit(1)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Grafana
# ---------------------------------------------------------------------------
@router.post("/grafana")
async def ingest_grafana(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_grafana_token: str | None = Header(None),
):
    """
    Grafana Alerting webhook receiver.
    Configure in Grafana: Alerting → Contact points → Webhook → URL
    """
    payload = await request.json()
    creator = await _get_system_user(db)
    results = []

    alerts = payload.get("alerts", [])
    if not alerts:
        # Legacy single-alert format
        alerts = [payload]

    for alert in alerts:
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        status = alert.get("status", payload.get("state", "alerting")).lower()
        title = annotations.get("summary") or labels.get("alertname") or payload.get("title", "Grafana Alert")
        message = annotations.get("description") or annotations.get("message") or ""
        severity_label = labels.get("severity", "high").lower()
        fingerprint = alert.get("fingerprint") or labels.get("alertname", "")

        resolved = status in ("ok", "resolved", "normal")

        if resolved:
            existing = await _find_open_incident(db, f"grafana:{fingerprint}")
            if existing:
                updated = await incident_service.update_incident(
                    db, existing,
                    IncidentUpdate(status=IncidentStatus.resolved),
                    creator,
                )
                results.append({"action": "resolved", "incident_id": updated.id})
            continue

        sev = _AM_SEVERITY_MAP.get(severity_label, Severity.high)
        tags = [f"grafana:{fingerprint}", "source:grafana"]
        tags += [f"{k}:{v}" for k, v in labels.items() if k not in ("alertname", "severity")]

        incident = await incident_service.create_incident(
            db,
            IncidentCreate(title=title, description=message or None, severity=sev, topic="grafana", tags=tags),
            creator,
        )
        results.append({"action": "created", "incident_id": incident.id})

    return {"processed": len(results), "results": results}


# ---------------------------------------------------------------------------
# Datadog
# ---------------------------------------------------------------------------
@router.post("/datadog")
async def ingest_datadog(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Datadog Webhooks integration receiver.
    Configure in Datadog: Integrations → Webhooks → add URL
    """
    payload = await request.json()
    creator = await _get_system_user(db)

    alert_type = payload.get("alert_type", "error").lower()
    title = payload.get("title", "Datadog Alert")
    message = payload.get("text") or payload.get("body", "")
    dd_tags = payload.get("tags", "")
    alert_id = str(payload.get("id", ""))

    tags = [f"datadog:{alert_id}", "source:datadog"]
    if isinstance(dd_tags, str):
        tags += [t.strip() for t in dd_tags.split(",") if t.strip()]
    elif isinstance(dd_tags, list):
        tags += dd_tags

    if alert_type in ("success", "recovery", "ok"):
        existing = await _find_open_incident(db, f"datadog:{alert_id}")
        if existing:
            updated = await incident_service.update_incident(
                db, existing, IncidentUpdate(status=IncidentStatus.resolved), creator
            )
            return {"action": "resolved", "incident_id": updated.id}
        return {"action": "no_match"}

    sev = _DATADOG_ALERT_MAP.get(alert_type, Severity.medium)
    incident = await incident_service.create_incident(
        db,
        IncidentCreate(title=title, description=message or None, severity=sev, topic="datadog", tags=tags),
        creator,
    )
    return {"action": "created", "incident_id": incident.id}


# ---------------------------------------------------------------------------
# Prometheus Alertmanager
# ---------------------------------------------------------------------------
@router.post("/alertmanager")
async def ingest_alertmanager(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Prometheus Alertmanager webhook receiver.
    Configure in alertmanager.yml:
      receivers:
        - name: overwatch
          webhook_configs:
            - url: http://overwatch:8000/ingest/alertmanager
    """
    payload = await request.json()
    creator = await _get_system_user(db)
    results = []

    for alert in payload.get("alerts", []):
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        status = alert.get("status", "firing").lower()
        fingerprint = alert.get("fingerprint", labels.get("alertname", ""))
        title = annotations.get("summary") or labels.get("alertname", "Prometheus Alert")
        message = annotations.get("description") or annotations.get("message") or ""
        severity_label = labels.get("severity", "warning").lower()

        tags = [f"am:{fingerprint}", "source:alertmanager"]
        tags += [f"{k}:{v}" for k, v in labels.items() if k not in ("alertname", "severity")]

        if status == "resolved":
            existing = await _find_open_incident(db, f"am:{fingerprint}")
            if existing:
                updated = await incident_service.update_incident(
                    db, existing, IncidentUpdate(status=IncidentStatus.resolved), creator
                )
                results.append({"action": "resolved", "incident_id": updated.id})
            continue

        sev = _AM_SEVERITY_MAP.get(severity_label, Severity.medium)
        incident = await incident_service.create_incident(
            db,
            IncidentCreate(title=title, description=message or None, severity=sev, topic="alertmanager", tags=tags),
            creator,
        )
        results.append({"action": "created", "incident_id": incident.id})

    return {"processed": len(results), "results": results}


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------
@router.post("/generic")
async def ingest_generic(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_overwatch_secret: str | None = Header(None),
):
    """
    Generic catch-all ingest endpoint.

    Expected payload:
    {
      "title": "Something broke",
      "message": "Details here",
      "severity": "critical",       // low|medium|high|critical
      "status": "firing",           // firing|resolved
      "topic": "my-topic",
      "tags": ["prod", "database"],
      "fingerprint": "unique-id"    // used to de-duplicate / auto-resolve
    }

    Optionally secure with X-Overwatch-Secret header (set in .env as INGEST_SECRET).
    """
    ingest_secret = getattr(settings, "ingest_secret", None)
    if ingest_secret and x_overwatch_secret != ingest_secret:
        raise HTTPException(status_code=401, detail="Invalid ingest secret")

    payload = await request.json()
    creator = await _get_system_user(db)

    title = payload.get("title", "Generic Alert")
    message = payload.get("message") or payload.get("description", "")
    severity_raw = payload.get("severity", "medium").lower()
    status_raw = payload.get("status", "firing").lower()
    topic = payload.get("topic", "generic")
    tags = payload.get("tags", [])
    fingerprint = payload.get("fingerprint", "")

    if fingerprint:
        tags = [f"generic:{fingerprint}"] + [t for t in tags if not t.startswith("generic:")]

    resolved = status_raw in ("resolved", "ok", "success")

    if resolved and fingerprint:
        existing = await _find_open_incident(db, f"generic:{fingerprint}")
        if existing:
            updated = await incident_service.update_incident(
                db, existing, IncidentUpdate(status=IncidentStatus.resolved), creator
            )
            return {"action": "resolved", "incident_id": updated.id}
        return {"action": "no_match"}

    sev_map = {"low": Severity.low, "medium": Severity.medium, "high": Severity.high, "critical": Severity.critical}
    sev = sev_map.get(severity_raw, Severity.medium)

    incident = await incident_service.create_incident(
        db,
        IncidentCreate(title=title, description=message or None, severity=sev, topic=topic, tags=tags),
        creator,
    )
    return {"action": "created", "incident_id": incident.id}
