from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.routers import (
    auth, incidents, tasks, channels, notifications,
    ingest, services, oncall, postmortems, escalations,
    templates, maintenance, metrics, status, integrations,
)
from app.services.escalation_service import start_background_task


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    start_background_task()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Modern incident management platform with Slack, Teams, and ntfy notifications.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(tasks.router)
app.include_router(channels.router)
app.include_router(notifications.router)
app.include_router(ingest.router)
app.include_router(services.router)
app.include_router(oncall.router)
app.include_router(postmortems.router)
app.include_router(escalations.router)
app.include_router(templates.router)
app.include_router(maintenance.router)
app.include_router(metrics.router)
app.include_router(status.router)
app.include_router(integrations.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
