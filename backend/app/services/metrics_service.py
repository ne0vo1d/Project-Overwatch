from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.models.incident import Incident, IncidentStatus, Severity
from app.models.service import Service
from app.schemas.metrics import (
    MetricsSummary, SeverityBreakdown, StatusBreakdown,
    DailyCount, ServiceIncidentCount, MttrBySeverity,
)


async def get_metrics(db: AsyncSession) -> MetricsSummary:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # ── Total and open counts ──────────────────────────────────────────────
    total_result = await db.execute(select(func.count()).select_from(Incident))
    total = total_result.scalar() or 0

    open_result = await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status.not_in([IncidentStatus.resolved, IncidentStatus.closed])
        )
    )
    open_count = open_result.scalar() or 0

    resolved_30d_result = await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status.in_([IncidentStatus.resolved, IncidentStatus.closed]),
            Incident.resolved_at >= thirty_days_ago,
        )
    )
    resolved_30d = resolved_30d_result.scalar() or 0

    # ── Severity breakdown ─────────────────────────────────────────────────
    sev_result = await db.execute(
        select(Incident.severity, func.count()).group_by(Incident.severity)
    )
    sev_map = {row[0].value: row[1] for row in sev_result.all()}
    severity_breakdown = SeverityBreakdown(
        low=sev_map.get("low", 0),
        medium=sev_map.get("medium", 0),
        high=sev_map.get("high", 0),
        critical=sev_map.get("critical", 0),
    )

    # ── Status breakdown ───────────────────────────────────────────────────
    stat_result = await db.execute(
        select(Incident.status, func.count()).group_by(Incident.status)
    )
    stat_map = {row[0].value: row[1] for row in stat_result.all()}
    status_breakdown = StatusBreakdown(
        new=stat_map.get("new", 0),
        active=stat_map.get("active", 0),
        stable=stat_map.get("stable", 0),
        resolved=stat_map.get("resolved", 0),
        closed=stat_map.get("closed", 0),
    )

    # ── MTTR ───────────────────────────────────────────────────────────────
    mttr_result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Incident.resolved_at - Incident.created_at) / 60
            )
        ).where(Incident.resolved_at.is_not(None))
    )
    mttr_overall = mttr_result.scalar()

    mttr_by_sev: dict[str, float | None] = {}
    for sev in Severity:
        r = await db.execute(
            select(
                func.avg(
                    func.extract("epoch", Incident.resolved_at - Incident.created_at) / 60
                )
            ).where(
                Incident.resolved_at.is_not(None),
                Incident.severity == sev,
            )
        )
        mttr_by_sev[sev.value] = r.scalar()

    # ── Daily counts (last 30 days) ────────────────────────────────────────
    daily_result = await db.execute(
        select(
            func.date_trunc("day", Incident.created_at).label("day"),
            func.count().label("cnt"),
        )
        .where(Incident.created_at >= thirty_days_ago)
        .group_by("day")
        .order_by("day")
    )
    raw_daily = {row.day.date().isoformat(): row.cnt for row in daily_result.all()}

    # Fill in zeros for days with no incidents
    daily_counts: list[DailyCount] = []
    for i in range(30):
        d = (now - timedelta(days=29 - i)).date().isoformat()
        daily_counts.append(DailyCount(date=d, count=raw_daily.get(d, 0)))

    # ── Top services ───────────────────────────────────────────────────────
    top_result = await db.execute(
        select(
            Incident.service_id,
            func.count().label("cnt"),
        )
        .where(Incident.service_id.is_not(None))
        .group_by(Incident.service_id)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_rows = top_result.all()

    top_services: list[ServiceIncidentCount] = []
    for row in top_rows:
        svc_result = await db.execute(select(Service.name).where(Service.id == row.service_id))
        svc_name = svc_result.scalar_one_or_none() or row.service_id
        top_services.append(ServiceIncidentCount(
            service_id=row.service_id,
            service_name=svc_name,
            count=row.cnt,
        ))

    return MetricsSummary(
        total_incidents=total,
        open_incidents=open_count,
        resolved_last_30d=resolved_30d,
        severity_breakdown=severity_breakdown,
        status_breakdown=status_breakdown,
        mttr_minutes=round(float(mttr_overall), 1) if mttr_overall else None,
        mttr_by_severity=MttrBySeverity(
            low=round(float(mttr_by_sev["low"]), 1) if mttr_by_sev.get("low") else None,
            medium=round(float(mttr_by_sev["medium"]), 1) if mttr_by_sev.get("medium") else None,
            high=round(float(mttr_by_sev["high"]), 1) if mttr_by_sev.get("high") else None,
            critical=round(float(mttr_by_sev["critical"]), 1) if mttr_by_sev.get("critical") else None,
        ),
        daily_counts=daily_counts,
        top_services=top_services,
    )
