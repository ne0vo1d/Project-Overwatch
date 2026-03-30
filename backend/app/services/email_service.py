"""
SendGrid email notification service.
Uses the SendGrid Web API v3 via httpx (no extra SDK dependency).
"""
import httpx
from typing import Optional
from app.models.incident import Severity, IncidentStatus

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"

SEVERITY_COLOR = {
    Severity.low: "#36a64f",
    Severity.medium: "#f0c929",
    Severity.high: "#e07b39",
    Severity.critical: "#cc0000",
}

SEVERITY_LABEL = {
    Severity.low: "LOW",
    Severity.medium: "MEDIUM",
    Severity.high: "HIGH",
    Severity.critical: "CRITICAL",
}

STATUS_ICON = {
    IncidentStatus.new: "🆕",
    IncidentStatus.active: "🔥",
    IncidentStatus.stable: "🟢",
    IncidentStatus.resolved: "✅",
    IncidentStatus.closed: "🔒",
}


def _build_html(
    title: str,
    message: str,
    severity: Optional[str],
    status: Optional[str],
    incident_id: Optional[str],
    tags: list[str],
    base_url: str,
) -> str:
    sev = Severity(severity) if severity else None
    stat = IncidentStatus(status) if status else None
    color = SEVERITY_COLOR.get(sev, "#0078D4") if sev else "#0078D4"
    sev_label = SEVERITY_LABEL.get(sev, "") if sev else ""
    status_text = f"{STATUS_ICON.get(stat, '')} {stat.value.replace('_', ' ').title()}" if stat else ""
    tags_html = "".join(
        f'<span style="display:inline-block;background:#1e2a3a;border:1px solid #3a4a5a;'
        f'border-radius:4px;padding:2px 8px;margin:2px;font-size:12px;color:#8ba1b7;">{t}</span>'
        for t in tags
    )
    incident_link = (
        f'<p style="margin-top:20px;">'
        f'<a href="{base_url}/incidents/{incident_id}" '
        f'style="background:{color};color:white;padding:10px 20px;border-radius:6px;'
        f'text-decoration:none;font-weight:600;font-size:14px;">View Incident →</a></p>'
        if incident_id else ""
    )

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:12px;border:1px solid #30363d;overflow:hidden;max-width:600px;">

        <!-- Header bar -->
        <tr><td style="background:{color};padding:4px 0;"></td></tr>

        <!-- Logo row -->
        <tr>
          <td style="padding:24px 32px 0;border-bottom:1px solid #21262d;">
            <span style="font-size:18px;font-weight:700;color:white;letter-spacing:-0.5px;">
              &#128737; Project Overwatch
            </span>
            {"<span style='float:right;background:" + color + ";color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;'>" + sev_label + "</span>" if sev_label else ""}
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:white;line-height:1.3;">{title}</h1>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding:16px 32px;">
            <p style="margin:0;font-size:14px;color:#8b949e;line-height:1.6;">{message}</p>
          </td>
        </tr>

        <!-- Meta table -->
        {"<tr><td style='padding:0 32px 24px;'><table width='100%' cellpadding='0' cellspacing='0' style='background:#0d1117;border-radius:8px;border:1px solid #21262d;'>" +
        ("<tr><td style='padding:12px 16px;border-bottom:1px solid #21262d;'><span style='font-size:11px;color:#8b949e;text-transform:uppercase;font-weight:600;'>Status</span><br><span style='font-size:14px;color:white;margin-top:4px;display:block;'>" + status_text + "</span></td></tr>" if status_text else "") +
        ("<tr><td style='padding:12px 16px;border-bottom:1px solid #21262d;'><span style='font-size:11px;color:#8b949e;text-transform:uppercase;font-weight:600;'>Severity</span><br><span style='font-size:14px;font-weight:700;margin-top:4px;display:block;color:" + color + ";'>" + sev_label + "</span></td></tr>" if sev_label else "") +
        ("<tr><td style='padding:12px 16px;'><span style='font-size:11px;color:#8b949e;text-transform:uppercase;font-weight:600;'>Tags</span><br><div style='margin-top:6px;'>" + tags_html + "</div></td></tr>" if tags else "") +
        "</table></td></tr>" if (status_text or sev_label or tags) else ""}

        <!-- CTA -->
        {"<tr><td style='padding:0 32px 32px;'>" + incident_link + "</td></tr>" if incident_id else ""}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #21262d;background:#0d1117;">
            <p style="margin:0;font-size:12px;color:#6e7681;">
              Sent by <strong style="color:#8b949e;">Project Overwatch</strong> &mdash;
              You received this because a notification channel is subscribed to this topic.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_email(
    api_key: str,
    to_emails: list[str],
    from_email: str,
    from_name: str,
    title: str,
    message: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_id: Optional[str] = None,
    tags: Optional[list[str]] = None,
    base_url: str = "http://localhost:3000",
) -> tuple[bool, Optional[str]]:
    """Send an incident notification email via SendGrid Web API v3."""
    html = _build_html(title, message, severity, status, incident_id, tags or [], base_url)

    # Plain-text fallback
    plain = f"{title}\n\n{message}"
    if severity:
        plain += f"\nSeverity: {severity.upper()}"
    if status:
        plain += f"\nStatus: {status}"
    if tags:
        plain += f"\nTags: {', '.join(tags)}"
    if incident_id:
        plain += f"\nView: {base_url}/incidents/{incident_id}"

    payload = {
        "personalizations": [{"to": [{"email": e} for e in to_emails]}],
        "from": {"email": from_email, "name": from_name},
        "subject": title,
        "content": [
            {"type": "text/plain", "value": plain},
            {"type": "text/html", "value": html},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                SENDGRID_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            # SendGrid returns 202 Accepted on success
            if resp.status_code == 202:
                return True, None
            return False, f"SendGrid returned {resp.status_code}: {resp.text}"
    except Exception as e:
        return False, str(e)
