from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ServiceMemberRead(BaseModel):
    id: str
    user_id: str
    role: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ServiceCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    tags: list[str] = []
    topic: Optional[str] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    tags: Optional[list[str]] = None
    topic: Optional[str] = None


class ServiceRead(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    tags: list[str]
    topic: Optional[str] = None
    created_at: datetime
    members: list[ServiceMemberRead] = []

    model_config = {"from_attributes": True}
