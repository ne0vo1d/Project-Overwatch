from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class OnCallEntryCreate(BaseModel):
    user_id: str
    start_at: datetime
    end_at: datetime
    role: str = "primary"


class OnCallEntryRead(BaseModel):
    id: str
    schedule_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    start_at: datetime
    end_at: datetime
    role: str

    model_config = {"from_attributes": True}


class OnCallScheduleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    service_id: Optional[str] = None
    timezone: str = "UTC"


class OnCallScheduleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    service_id: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


class OnCallScheduleRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    service_id: Optional[str] = None
    timezone: str
    is_active: bool
    created_at: datetime
    entries: list[OnCallEntryRead] = []

    model_config = {"from_attributes": True}


class CurrentOnCall(BaseModel):
    schedule_id: str
    schedule_name: str
    primary: Optional[OnCallEntryRead] = None
    secondary: Optional[OnCallEntryRead] = None
