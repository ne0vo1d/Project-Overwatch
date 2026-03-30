from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PostmortemRead(BaseModel):
    id: str
    incident_id: str
    content: str
    created_by: Optional[str] = None
    author_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostmortemUpdate(BaseModel):
    content: str
