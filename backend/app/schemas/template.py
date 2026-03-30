from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.incident import Severity


class TemplateTaskItem(BaseModel):
    title: str
    description: Optional[str] = None


class IncidentTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    incident_title_template: Optional[str] = None
    incident_description_template: Optional[str] = None
    severity: Severity = Severity.medium
    tags: list[str] = []
    topic: Optional[str] = None
    service_id: Optional[str] = None
    runbook_url: Optional[str] = None
    tasks: list[TemplateTaskItem] = []


class IncidentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    incident_title_template: Optional[str] = None
    incident_description_template: Optional[str] = None
    severity: Optional[Severity] = None
    tags: Optional[list[str]] = None
    topic: Optional[str] = None
    service_id: Optional[str] = None
    runbook_url: Optional[str] = None
    tasks: Optional[list[TemplateTaskItem]] = None


class IncidentTemplateRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    incident_title_template: Optional[str] = None
    incident_description_template: Optional[str] = None
    severity: Severity
    tags: list[str]
    topic: Optional[str] = None
    service_id: Optional[str] = None
    runbook_url: Optional[str] = None
    tasks: list[TemplateTaskItem]
    created_at: datetime

    model_config = {"from_attributes": True}
