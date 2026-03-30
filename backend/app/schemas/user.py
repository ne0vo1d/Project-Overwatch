from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    slack_user_id: Optional[str] = None
    teams_user_id: Optional[str] = None


class UserRead(BaseModel):
    id: str
    email: str
    name: str
    api_key: str
    is_active: bool
    is_admin: bool
    slack_user_id: Optional[str] = None
    teams_user_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
