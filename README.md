<div align="center">

```
 ██████╗ ██╗   ██╗███████╗██████╗ ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
██╔═══██╗██║   ██║██╔════╝██╔══██╗██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
██║   ██║██║   ██║█████╗  ██████╔╝██║ █╗ ██║███████║   ██║   ██║     ███████║
██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
╚██████╔╝ ╚████╔╝ ███████╗██║  ██║╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
 ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
```

**Modern, self-hosted incident management + push notification platform.**

*The operational control plane your on-call team actually deserves.*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## What is Overwatch?

Overwatch is a **Netflix Dispatch × ntfy** crossover — a self-hosted incident management system that combines structured incident lifecycles with lightweight, topic-based push notification routing.

When something breaks, Overwatch:

- **Creates the incident** — manually, or automatically from Grafana / Datadog / Prometheus Alertmanager
- **Assembles the right people** — service members and on-call responders are added automatically
- **Pings every channel simultaneously** — Slack, Microsoft Teams, email (SendGrid), webhooks, and ntfy
- **Tracks everything** — timeline, tasks, participants, status changes
- **Auto-resolves** — when your monitoring system says it's fixed, Overwatch closes the loop

---

## Features

### Incident Management
| Feature | Description |
|---|---|
| **Lifecycle states** | `new → active → stable → resolved → closed` with full audit trail |
| **Auto-assembly** | Service catalog members added as participants on incident creation |
| **On-call commander** | Current primary on-call is auto-assigned as incident commander |
| **Timeline** | Every state change, note, and participant addition logged with author |
| **Task tracking** | Per-incident tasks with assignee, status, and due date |
| **Auto-resolve** | Ingest adapters close incidents when monitoring systems recover |

### Notification Routing
| Channel | What you get |
|---|---|
| **Slack** | Block Kit messages with severity colours, status badge, deep-link button. Supports both Incoming Webhooks and Bot API (`chat.postMessage`) |
| **Microsoft Teams** | Adaptive Cards (modern) or legacy MessageCard/O365 Connector format |
| **Email** | Responsive HTML email via SendGrid Web API v3 — severity-coloured header, facts table, CTA button, plain-text fallback |
| **ntfy** | HTTP push to ntfy.sh or your self-hosted instance — works with the ntfy mobile app |
| **Webhook** | JSON POST to any URL with optional HMAC secret |
| **SSE stream** | Browser/client subscription via `GET /notify/{topic}/sse` — no polling, no websockets |

Every channel supports **topic filtering** and **severity filtering** — your #critical-alerts Slack channel only gets `high` and `critical` incidents, your general webhook gets everything.

### Alert Ingestion
Drop-in receivers for common monitoring stacks. Point your existing alerting at Overwatch and incidents are created (and resolved) automatically.

```
POST /ingest/grafana        ← Grafana Alerting
POST /ingest/datadog        ← Datadog Webhooks
POST /ingest/alertmanager   ← Prometheus Alertmanager
POST /ingest/generic        ← Anything else
```

### Service Catalog & On-Call
- Register services with owners, tags, and a default notification topic
- Define on-call schedules with weekly rotation entries (primary + secondary)
- `GET /oncall/current` — always know who to wake up

---

## Architecture

```
                          ┌─────────────────────────────────┐
                          │          Overwatch UI            │
                          │  Next.js 15 · Tailwind · React   │
                          │    Query · SSE live feed         │
                          └──────────────┬──────────────────┘
                                         │ REST API
                          ┌──────────────▼──────────────────┐
                          │         FastAPI Backend          │
                          │                                  │
                    ┌─────┤  /incidents   /notify/{topic}   ├─────┐
                    │     │  /services    /oncall            │     │
                    │     │  /channels    /ingest/*          │     │
                    │     │  /tasks       /auth              │     │
                    │     └──────┬──────────────┬───────────┘     │
                    │            │              │                  │
              ┌─────▼──────┐  ┌─▼──────┐  ┌───▼──────────────────▼────┐
              │ PostgreSQL │  │ Redis  │  │    Notification Services   │
              │   Models   │  │Pub/Sub │  │                            │
              │  Alembic   │  │  SSE   │  │  Slack  Teams  Email ntfy  │
              └────────────┘  └────────┘  │  Webhook  Generic          │
                                          └────────────────────────────┘
                                                      ▲
              ┌───────────────────────────────────────┘
              │          Alert Ingestion
              │
       ┌──────┴──────┬──────────────┬──────────────┐
       │             │              │              │
  ┌────▼────┐  ┌─────▼────┐  ┌─────▼──────┐  ┌───▼─────┐
  │ Grafana │  │ Datadog  │  │Alertmanager│  │ Generic │
  └─────────┘  └──────────┘  └────────────┘  └─────────┘
```

---

## Quick Start

**Prerequisites:** Docker + Docker Compose

```bash
git clone https://github.com/ne0vo1d/project-overwatch
cd project-overwatch

# Configure your environment
cp .env.example .env
# Edit .env — at minimum set a SECRET_KEY

# Launch everything
docker compose up
```

| Service | URL |
|---|---|
| **Dashboard** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

### First steps

1. Open http://localhost:3000/settings
2. Register an account
3. Copy your **API key** from the `/auth/me` response
4. Add your first notification channel at `/channels`
5. Create an incident — watch it land in Slack/Teams/email

---

## Configuration

### Environment variables

```bash
# .env

SECRET_KEY=change-me-to-a-long-random-string   # REQUIRED

# Slack — Option A: Incoming Webhook (simplest)
SLACK_DEFAULT_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# Slack — Option B: Bot Token (richer Block Kit messages)
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Microsoft Teams — Incoming Webhook URL
TEAMS_DEFAULT_WEBHOOK_URL=https://your-org.webhook.office.com/...

# SendGrid
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
SENDGRID_FROM_NAME=Project Overwatch

# ntfy (optional — for forwarding to ntfy.sh or self-hosted)
NTFY_BASE_URL=https://ntfy.sh
NTFY_TOKEN=

# Ingest — optional secret to protect /ingest/generic
INGEST_SECRET=
```

---

## Notification Channels

Channels are configured via the UI (`/channels`) or the API. Each channel subscribes to **topics** and optionally filters by **severity**.

### Slack (Incoming Webhook)
```json
{
  "name": "#incidents",
  "type": "slack",
  "config": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#incidents"
  },
  "topics": [],
  "severities": []
}
```

### Slack (Bot API)
```json
{
  "name": "#critical-only",
  "type": "slack",
  "config": {
    "bot_token": "xoxb-...",
    "channel": "#critical-only"
  },
  "topics": [],
  "severities": ["high", "critical"]
}
```

### Microsoft Teams
```json
{
  "name": "SRE Team",
  "type": "teams",
  "config": {
    "webhook_url": "https://your-org.webhook.office.com/..."
  },
  "topics": ["infra", "security"],
  "severities": []
}
```

> **Tip:** Set `"use_adaptive_card": false` in config for legacy O365 Connector Card format.

### Email (SendGrid)
```json
{
  "name": "On-Call Email",
  "type": "email",
  "config": {
    "api_key": "SG.xxxx",
    "from_email": "alerts@yourdomain.com",
    "from_name": "Project Overwatch",
    "to_emails": ["oncall@yourdomain.com", "manager@yourdomain.com"]
  },
  "topics": [],
  "severities": ["critical"]
}
```

### ntfy
```json
{
  "name": "ntfy Mobile Push",
  "type": "ntfy",
  "config": {
    "base_url": "https://ntfy.sh",
    "topic": "my-overwatch-incidents",
    "token": "tk_optional"
  },
  "topics": [],
  "severities": []
}
```

### Generic Webhook
```json
{
  "name": "PagerDuty Bridge",
  "type": "webhook",
  "config": {
    "url": "https://events.pagerduty.com/...",
    "secret": "my-hmac-secret",
    "headers": { "X-Custom": "value" }
  },
  "topics": [],
  "severities": []
}
```

**Test any channel** from the UI or:
```bash
curl -X POST http://localhost:8000/channels/{id}/test \
  -H "Authorization: Bearer $TOKEN"
```

---

## Alert Ingestion

### Grafana
In Grafana → **Alerting → Contact points → + Add contact point → Webhook**:

```
URL: http://overwatch:8000/ingest/grafana
Method: POST
```

Overwatch maps Grafana alert states:

| Grafana state | Incident status | Default severity |
|---|---|---|
| `alerting` | `active` | `high` |
| `pending` | `new` | `medium` |
| `ok` | Auto-resolves open incident | — |
| `no_data` | `new` | `low` |

### Prometheus Alertmanager
```yaml
# alertmanager.yml
receivers:
  - name: overwatch
    webhook_configs:
      - url: http://overwatch:8000/ingest/alertmanager
        send_resolved: true

route:
  receiver: overwatch
```

Severity is read from the `severity` label on the alert. Resolved alerts automatically close the matching open incident.

### Datadog
In Datadog → **Integrations → Webhooks → + New**:

```
URL: https://your-overwatch.example.com/ingest/datadog
Payload: (default JSON)
```

### Generic (any system)
```bash
# Fire an incident
curl -X POST http://localhost:8000/ingest/generic \
  -H "Content-Type: application/json" \
  -H "X-Overwatch-Secret: $INGEST_SECRET" \
  -d '{
    "title": "Primary database unreachable",
    "message": "Connection pool exhausted on db-primary-01",
    "severity": "critical",
    "status": "firing",
    "topic": "database",
    "tags": ["prod", "postgres"],
    "fingerprint": "db-primary-unreachable"
  }'

# Auto-resolve it later
curl -X POST http://localhost:8000/ingest/generic \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "fingerprint": "db-primary-unreachable"}'
```

---

## Real-Time SSE Feed

Subscribe to live incident events directly from the browser or CLI — no polling, no WebSocket setup.

### Browser (JavaScript)
```javascript
const token = localStorage.getItem('token')
const source = new EventSource(
  `http://localhost:8000/notify/incidents/sse?token=${token}`
)

source.onmessage = (e) => {
  const event = JSON.parse(e.data)
  console.log(event.title, event.severity)
}
```

### curl
```bash
# Subscribe to all topics
curl -N "http://localhost:8000/notify/*/sse" \
  -H "Authorization: Bearer $TOKEN"

# Subscribe to a specific topic
curl -N "http://localhost:8000/notify/security/sse" \
  -H "Authorization: Bearer $TOKEN"
```

### Publish (ntfy-compatible API)
```bash
curl -X POST http://localhost:8000/notify/security \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Suspicious login detected",
    "message": "10 failed attempts from 203.0.113.42",
    "priority": "urgent",
    "tags": ["auth", "prod"]
  }'
```

---

## API Reference

Authentication: `Authorization: Bearer <jwt>` or `X-API-Key: <api_key>`

### Incidents
```
GET    /incidents                    List incidents (filter: status, severity, topic)
POST   /incidents                    Create incident
GET    /incidents/{id}               Get incident with timeline and participants
PATCH  /incidents/{id}               Update status, severity, tags
POST   /incidents/{id}/notes         Add timeline note
POST   /incidents/{id}/participants  Add participant
```

### Tasks
```
GET    /incidents/{id}/tasks         List tasks
POST   /incidents/{id}/tasks         Create task
PATCH  /incidents/{id}/tasks/{tid}   Update task status/assignee
DELETE /incidents/{id}/tasks/{tid}   Delete task
```

### Notifications
```
POST   /notify/{topic}               Publish notification to topic
GET    /notify/{topic}               Notification history
GET    /notify/{topic}/sse           Real-time SSE stream
```

### Channels
```
GET    /channels                     List channels
POST   /channels                     Create channel (admin)
PATCH  /channels/{id}                Update channel (admin)
DELETE /channels/{id}                Delete channel (admin)
POST   /channels/{id}/test           Send test notification
```

### Services
```
GET    /services                     List services
POST   /services                     Create service
PATCH  /services/{id}                Update service
POST   /services/{id}/members        Add member
DELETE /services/{id}/members/{uid}  Remove member
```

### On-Call
```
GET    /oncall/current               Who is on call right now
GET    /oncall/schedules             List schedules
POST   /oncall/schedules             Create schedule
POST   /oncall/schedules/{id}/entries  Add rotation entry
DELETE /oncall/schedules/{id}/entries/{eid}  Remove entry
```

### Ingest
```
POST   /ingest/grafana               Grafana Alerting
POST   /ingest/datadog               Datadog Webhooks
POST   /ingest/alertmanager          Prometheus Alertmanager
POST   /ingest/generic               Generic JSON payload
```

---

## Database Migrations

Overwatch uses **Alembic** for schema migrations with full async PostgreSQL support.

```bash
# Inside the backend container
docker compose exec backend bash

# Apply all migrations
alembic upgrade head

# Check current revision
alembic current

# Roll back one step
alembic downgrade -1

# Generate a new migration after model changes
alembic revision --autogenerate -m "add postmortem table"
```

> On first startup, `create_all()` handles table creation automatically for development.
> For production, run `alembic upgrade head` as part of your deployment pipeline.

---

## Development

```bash
# Backend — with hot reload
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend — with hot reload
cd frontend
npm install
npm run dev
```

**Services needed locally:**
```bash
docker compose up db redis   # Start only PostgreSQL and Redis
```

### Project structure

```
project-overwatch/
├── backend/
│   ├── alembic/                 # Database migrations
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── app/
│   │   ├── core/                # Auth (JWT + API key), dependencies
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── incident.py      # Incident, IncidentParticipant
│   │   │   ├── service.py       # Service, ServiceMember
│   │   │   ├── oncall.py        # OnCallSchedule, OnCallEntry
│   │   │   ├── channel.py       # NotificationChannel
│   │   │   ├── notification.py  # Notification delivery log
│   │   │   ├── task.py
│   │   │   ├── timeline.py
│   │   │   └── user.py
│   │   ├── routers/             # FastAPI route handlers
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── services/            # Business logic
│   │       ├── slack_service.py    # Block Kit, Webhooks, Bot API
│   │       ├── teams_service.py    # Adaptive Cards + MessageCard
│   │       ├── email_service.py    # SendGrid Web API v3
│   │       ├── notification_service.py  # Dispatch router
│   │       ├── incident_service.py      # Lifecycle + auto-assembly
│   │       └── pubsub.py              # SSE broker + Redis fan-out
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── page.tsx            # Dashboard
│       │   ├── incidents/          # List + detail
│       │   ├── services/           # Service catalog
│       │   ├── oncall/             # On-call schedules
│       │   ├── channels/           # Channel management
│       │   ├── notifications/      # SSE live feed
│       │   └── settings/           # Auth + API key
│       ├── components/
│       └── lib/
│           ├── api.ts           # Axios client + all API calls
│           └── types.ts         # TypeScript interfaces
├── docker-compose.yml
└── .env.example
```

---

## Deployment

### Docker Compose (recommended)
```bash
cp .env.example .env
# Fill in SECRET_KEY, SendGrid key, Slack/Teams webhooks

docker compose up -d
docker compose exec backend alembic upgrade head
```

### Environment hardening checklist
- [ ] Set a strong random `SECRET_KEY` (32+ chars)
- [ ] Set `INGEST_SECRET` to protect `/ingest/generic`
- [ ] Put Overwatch behind a TLS reverse proxy (nginx, Caddy, Traefik)
- [ ] Restrict the API port (8000) to internal traffic only
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Rotate the default API keys after first login

---

## Roadmap

- [ ] Postmortem generator — auto-draft from incident timeline on close
- [ ] PagerDuty integration — escalation policies via PagerDuty Events API
- [ ] RBAC — per-service permission scopes
- [ ] Runbook attachments — link runbooks to services
- [ ] Metrics dashboard — MTTR, MTTD, incident frequency charts
- [ ] Slack slash commands — `/overwatch status`, `/overwatch page`
- [ ] Email-to-incident — ingest alerts via email webhook (SendGrid Inbound Parse)

---

<div align="center">

Built with FastAPI, Next.js, PostgreSQL, Redis, and strong opinions about on-call hygiene.

</div>
