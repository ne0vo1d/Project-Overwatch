"""
Teams adaptive card action handler.
Teams cards include Action.OpenUrl buttons pointing to signed magic-link URLs.
When clicked, the user's browser hits this endpoint which validates the JWT,
performs the action, and returns a confirmation page.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.database import get_db
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentUpdate
from app.services import incident_service
from app.config import settings
from app.core.deps import get_current_user

router = APIRouter(prefix="/integrations", tags=["integrations"])

ACTION_TOKEN_EXPIRE_HOURS = 24
ALGORITHM = "HS256"


def create_action_token(incident_id: str, action: str) -> str:
    """Create a short-lived signed token for a Teams card action."""
    expire = datetime.now(timezone.utc) + timedelta(hours=ACTION_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"incident_id": incident_id, "action": action, "exp": expire},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def _action_button_url(incident_id: str, action: str, base_url: str) -> str:
    token = create_action_token(incident_id, action)
    return f"{base_url}/integrations/teams/action?token={token}"


@router.get("/teams/action", response_class=HTMLResponse)
async def teams_action(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Called when a user clicks Acknowledge or Resolve on a Teams Adaptive Card.
    Validates the signed token, updates the incident, and returns a confirmation page.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        incident_id: str = payload["incident_id"]
        action: str = payload["action"]
    except (JWTError, KeyError):
        return _html_response("Invalid or expired action link", success=False)

    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        return _html_response("Incident not found", success=False)

    # Get a system user to record the action
    system_result = await db.execute(select(User).where(User.is_admin == True).limit(1))
    actor = system_result.scalar_one_or_none()
    if not actor:
        actor_result = await db.execute(select(User).limit(1))
        actor = actor_result.scalar_one_or_none()

    if action == "acknowledge":
        from app.models.incident import IncidentStatus
        if incident.status == IncidentStatus.new:
            await incident_service.update_incident(
                db, incident, IncidentUpdate(status=IncidentStatus.active), actor
            )
        return _html_response(
            f"Incident acknowledged: {incident.title}",
            success=True,
            incident_id=incident_id,
        )

    elif action == "resolve":
        from app.models.incident import IncidentStatus
        if incident.status not in (IncidentStatus.resolved, IncidentStatus.closed):
            await incident_service.update_incident(
                db, incident, IncidentUpdate(status=IncidentStatus.resolved), actor
            )
        return _html_response(
            f"Incident resolved: {incident.title}",
            success=True,
            incident_id=incident_id,
        )

    return _html_response(f"Unknown action: {action}", success=False)


def _html_response(message: str, success: bool, incident_id: str | None = None) -> HTMLResponse:
    color = "#36a64f" if success else "#cc0000"
    icon = "✅" if success else "❌"
    link = (
        f'<p><a href="javascript:window.close()" style="color:#8b949e;font-size:13px;">Close this tab</a></p>'
        if incident_id else ""
    )
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project Overwatch</title>
  <style>
    body {{margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
           display:flex;align-items:center;justify-content:center;min-height:100vh;}}
    .card {{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;max-width:400px;}}
    .icon {{font-size:48px;margin-bottom:16px;}}
    h2 {{color:white;margin:0 0 8px;font-size:18px;}}
    p {{color:#8b949e;font-size:14px;margin:4px 0;}}
    .bar {{background:{color};height:4px;border-radius:2px;margin-bottom:28px;}}
    a {{color:{color};}}
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <div class="icon">{icon}</div>
    <h2>Project Overwatch</h2>
    <p>{message}</p>
    {link}
  </div>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)
