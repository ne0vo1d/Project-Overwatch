from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EscalationStepCreate(BaseModel):
    step_order: int
    delay_minutes: int
    notify_channel_ids: list[str] = []
    notify_oncall_secondary: bool = False
    message_template: Optional[str] = None


class EscalationStepRead(BaseModel):
    id: str
    step_order: int
    delay_minutes: int
    notify_channel_ids: list[str]
    notify_oncall_secondary: bool
    message_template: Optional[str] = None

    model_config = {"from_attributes": True}


class EscalationPolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    service_id: Optional[str] = None
    steps: list[EscalationStepCreate] = []


class EscalationPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    service_id: Optional[str] = None
    is_active: Optional[bool] = None


class EscalationPolicyRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    service_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    steps: list[EscalationStepRead] = []

    model_config = {"from_attributes": True}
