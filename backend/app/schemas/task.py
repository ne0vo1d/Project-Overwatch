from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.task import TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[str] = None
    due_at: Optional[datetime] = None


class TaskRead(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    incident_id: str
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    created_at: datetime
    due_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
