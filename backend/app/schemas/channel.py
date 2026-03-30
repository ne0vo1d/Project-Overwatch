from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any
from app.models.channel import ChannelType


class ChannelCreate(BaseModel):
    name: str
    type: ChannelType
    config: dict[str, Any]
    topics: list[str] = []
    severities: list[str] = []


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    topics: Optional[list[str]] = None
    severities: Optional[list[str]] = None
    is_active: Optional[bool] = None


class ChannelRead(BaseModel):
    id: str
    name: str
    type: ChannelType
    config: dict[str, Any]
    topics: list[str]
    severities: list[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    def model_post_init(self, __context: Any) -> None:
        # Mask sensitive config fields before returning
        sensitive = {"webhook_url", "bot_token", "token", "secret"}
        self.config = {
            k: ("***" if k in sensitive and v else v)
            for k, v in self.config.items()
        }
