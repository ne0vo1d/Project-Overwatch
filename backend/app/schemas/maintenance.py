from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MaintenanceWindowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    service_ids: list[str] = []
    topics: list[str] = []


class MaintenanceWindowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    service_ids: Optional[list[str]] = None
    topics: Optional[list[str]] = None
    is_active: Optional[bool] = None


class MaintenanceWindowRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    service_ids: list[str]
    topics: list[str]
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime
    is_currently_active: bool = False

    model_config = {"from_attributes": True}
