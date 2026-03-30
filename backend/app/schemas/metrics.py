from pydantic import BaseModel
from typing import Optional


class SeverityBreakdown(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class StatusBreakdown(BaseModel):
    new: int = 0
    active: int = 0
    stable: int = 0
    resolved: int = 0
    closed: int = 0


class DailyCount(BaseModel):
    date: str   # YYYY-MM-DD
    count: int


class ServiceIncidentCount(BaseModel):
    service_id: str
    service_name: str
    count: int


class MttrBySeverity(BaseModel):
    low: Optional[float] = None     # minutes
    medium: Optional[float] = None
    high: Optional[float] = None
    critical: Optional[float] = None


class MetricsSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_last_30d: int
    severity_breakdown: SeverityBreakdown
    status_breakdown: StatusBreakdown
    mttr_minutes: Optional[float] = None        # overall average
    mttr_by_severity: MttrBySeverity
    daily_counts: list[DailyCount]              # last 30 days
    top_services: list[ServiceIncidentCount]    # top 5
