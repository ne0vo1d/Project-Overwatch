from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    app_name: str = "Project Overwatch"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://overwatch:overwatch@db:5432/overwatch"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Slack
    slack_default_webhook_url: Optional[str] = None
    slack_bot_token: Optional[str] = None

    # Microsoft Teams
    teams_default_webhook_url: Optional[str] = None

    # ntfy
    ntfy_base_url: str = "https://ntfy.sh"
    ntfy_token: Optional[str] = None

    # SendGrid
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: str = "overwatch@example.com"
    sendgrid_from_name: str = "Project Overwatch"

    # Ingest
    ingest_secret: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
