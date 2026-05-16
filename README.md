# AstroLumina Booking API

REST API for managing **Cal.com** bookings — session scheduling, availability checking, and booking lifecycle management for the AstroLumina astrological services platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-green.svg)](https://expressjs.com/)
[![Node](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Cal.com](https://img.shields.io/badge/Cal.com-v2-111827.svg)](https://cal.com/)

## Overview

The Booking API provides a domain-specific interface over Cal.com's scheduling infrastructure, enabling customers to self-serve book astrological consultation sessions with:

- Real-time availability checking
- Session type catalog with descriptions
- Full booking lifecycle (create, reschedule, cancel)
- Automatic Zoom integration for video sessions
- Birth chart data collection during booking
- Sentry error tracking + profiling

## Available Sessions

| Session Key | Title | Duration | Price | Description |
|-------------|-------|----------|-------|-------------|
| `astrograma-natala-si-karmica` | Astrograma Natală și Karmică | 120 min | €75 | Live birth chart analysis — personality, purpose, talents, blocks, and transgenerational patterns |
| `astrograma-relationala` | Astrograma Relațională | 90 min | €75 | Relationship dynamics — synastry, compatibility, karmic lessons between two people |
| `astrograma-previzionala` | Astrograma Previzională | 90 min | €75 | 12-month forecast — favorable periods for career, relationships, decisions |

Each session collects:
- Phone number
- Birth date (date/month/year)
- Birth place (city, county, country)
- Birth time (24h format or AM/PM)

---

## Security

| Feature           | Implementation                                              |
| ----------------- | ----------------------------------------------------------- |
| **HTTP Headers**  | Helmet (CSP, HSTS, X-Frame-Options, etc.)                   |
| **Rate Limiting** | 30 requests/minute per IP                                   |
| **CORS**          | Dynamic whitelist built from `*_SERVER_PORT` / `*_SERVER_DNS` env vars (Astrology, Booking, Payment, Frontend services) + Cloudflare Pages domains (`astrolumina.pages.dev`, `develop.astrolumina.pages.dev`, `astrolumina.com`, `astrolumina.ro`). Override via `CORS_ORIGINS`. |
| **Request Size**  | Max 1MB body (returns `413` if exceeded)                    |
| **PII Scrubbing** | Sentry automatically redacts API keys from error reports    |
| **Input Validation** | Zod schemas on all endpoint inputs                       |
| **Environment Validation** | Zod-validated env.ts — app refuses to start with missing required vars |
| **Secrets Management** | All secrets (Cal.com API key, Resend key, D1/R2 credentials) managed via Doppler |

---

## Tech Stack

| Layer       | Technology                                  |
| ----------- | ------------------------------------------- |
| **Runtime**     | Node.js 22.x                                |
| **Language**    | TypeScript 5.8 (strict mode, ESM)           |
| **Framework**   | Express 5.x                                 |
| **HTTP Client** | Axios                                       |
| **Validation**  | Zod                                         |
| **Monitoring**  | Sentry 10.x (with profiling)                |
| **Security**    | Helmet, CORS, Rate Limiting (30 req/min/IP) |
| **Scheduling**  | Cal.com API v2                              |
| **Email**       | Resend                                      |
| **Database**    | Cloudflare D1 (SQLite)                      |
| **Storage**     | Cloudflare R2 (PDF attachments)             |
| **Secrets**     | Doppler                                     |
| **Container**   | Docker, Docker Compose                      |

---

## Project Structure

```
.
├── .github/
│   └── workflows/           # CI/CD pipelines
│       └── build-deploy.yml  # Docker image build & push
├── src/
│   ├── server.ts            # Express entry point + graceful shutdown
│   ├── instrument.ts        # Sentry initialization (imported first)
│   ├── config/
│   │   ├── env.ts           # Zod-based environment validation
│   │   └── session-slugs.ts # Session key → Cal.com slug mapping
│   ├── middleware/
│   │   ├── security.ts      # Helmet, CORS, rate limiter
│   │   └── error-handler.ts # Custom error types + global handler (Axios/Cal.com aware)
│   ├── routes/
│   │   ├── health.ts        # GET /health
│   │   ├── event-types.ts   # Event types + sessions listing
│   │   ├── bookings.ts      # Booking CRUD + reschedule + cancel
│   │   ├── availability.ts  # Available slots lookup
│   │   ├── email.ts         # Email sending with R2 attachments
│   │   └── events.ts        # Webhook handler for Cal.com events
│   ├── services/
│   │   ├── calcom.ts        # Cal.com API client (axios)
│   │   └── d1.ts            # Cloudflare D1 client
│   ├── db/
│   │   └── migrate.ts       # D1 database migrations
│   └── types/
│       └── calcom.ts        # Cal.com TypeScript interfaces
├── dist/                    # Compiled output (gitignored)
├── docker-compose.yml       # Single-service deployment
├── Dockerfile               # Multi-stage build
├── VERSION.json             # Version config
├── .dockerignore
├── .env.example             # Environment variables template (not committed)
├── tsconfig.json
└── package.json
```

---

## Architecture

The BookingAPI is a **single-service** deployment that orchestrates multiple external services:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │ GET/POST /api/*
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                 BookingAPI (1 replica)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │
│  │  Security  │→ │  Routes    │→ │  External Services         │ │
│  │  (Helmet,  │  │  (Zod      │  │                            │ │
│  │  CORS,     │  │  validate) │  │  ┌─────────────────────┐   │ │
│  │  Rate Lim) │  └────────────┘  │  │ Cal.com API         │   │ │
│  └────────────┘        │         │  │ (scheduling, Zoom)  │   │ │
│                        ▼         │  └─────────────────────┘   │ │
│                 Orchestrator     │  ┌─────────────────────┐   │ │
│                 (bookings,       │  │ Resend              │   │ │
│                  email, D1, R2)  │  │ (templated emails)  │   │ │
│                        │         │  └─────────────────────┘   │ │
│                        ▼         │  ┌─────────────────────┐   │ │
│                 Data Layer       │  │ Cloudflare D1       │   │ │
│                 (D1 SQLite,      │  │ (persistent data)   │   │ │
│                  R2 PDFs)        │  └─────────────────────┘   │ │
│                                  │  ┌─────────────────────┐   │ │
│  • healthcheck: /health every 30s│  │ Cloudflare R2       │   │ │
│  • resources: 0.125–1 CPU,      │  │ (PDF storage)       │   │ │
│    128M–1G RAM                  │  └─────────────────────┘   │ │
│  • Sentry error tracking        │                            │ │
│    + profiling                  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Cal.com API Versions

| Resource             | API Version  |
| -------------------- | ------------ |
| Event Types          | `2024-06-14` |
| Availability / Slots | `2024-09-04` |
| Bookings             | `2026-02-25` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | Environment: `development`, `staging`, `production` |
| `ASTROLOGY_API_SERVER_PORT` | Yes | — | Astrology API server port |
| `ASTROLOGY_API_SERVER_DNS` | Yes | — | Astrology API server DNS name |
| `BOOKING_API_SERVER_PORT` | Yes | — | Booking API server port |
| `BOOKING_API_SERVER_DNS` | Yes | — | Booking API server DNS name |
| `PAYMENT_API_SERVER_PORT` | Yes | — | Payment API server port |
| `PAYMENT_API_SERVER_DNS` | Yes | — | Payment API server DNS name |
| `FRONTEND_SERVER_PORT` | Yes | — | Frontend dev server port |
| `FRONTEND_SERVER_DNS` | Yes | — | Frontend server DNS name |
| `BOOKING_API_SENTRY_DSN` | Yes | — | Sentry DSN for error tracking |
| `CORS_ORIGINS` | No | _(dynamic defaults)_ | Comma-separated allowed CORS origins (overrides defaults) |
| `RESEND_API_KEY` | Yes | — | Resend API key for sending emails |
| `CALCOM_API_KEY` | Yes | — | Cal.com API key with bookings/write permissions |
| `CALCOM_BASE_URL` | Yes | — | Cal.com API base URL |
| `R2_BASE_URL` | Yes | — | Cloudflare R2 base URL (without `/pdfs` — appended automatically) |
| `D1_ACCOUNT_ID` | Yes | — | Cloudflare D1 account ID |
| `D1_DATABASE_ID` | Yes | — | Cloudflare D1 database ID |
| `D1_API_TOKEN` | Yes | — | Cloudflare D1 API token |

### Default CORS Origins

When `CORS_ORIGINS` is not set, the API allows requests from all 4 services (Frontend, Astrology API, Booking API, Payment API) on localhost, HTTP, and HTTPS variants, plus:

- `https://astrolumina.pages.dev`
- `https://develop.astrolumina.pages.dev`
- `https://astrolumina.com`
- `https://astrolumina.ro`

---

## Deployment

### Docker Compose

```bash
# Build and start the service
docker compose up -d

# View logs
docker compose logs -f booking-api

# Stop services
docker compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t astrolumina-booking-api:latest .

# Run container
docker run -p <PORT>:<PORT> --env-file .env astrolumina-booking-api:latest
```

### Render

```text
Build Command:  npm run render-build
Start Command:  npm start
Node Version:    22.x
```

### Image Registry

Images are automatically built and pushed to GitHub Container Registry:

```
ghcr.io/astrolumina-by-carmen-ilie/astrolumina-bookingapi:latest
ghcr.io/astrolumina-by-carmen-ilie/astrolumina-bookingapi:v1.0.0
```

### CI/CD Pipeline

Triggered on **PR merge to `main`**:

1. **Auto-version** — Reads `VERSION.json` for major/minor, increments patch, creates and pushes a git tag
2. **Docker build** — Builds image from the new tag and pushes to GitHub Container Registry

### Local Development

```bash
# Install dependencies
npm install

# Development (auto-reload with tsx)
npm run dev

# Production build
npm run build
npm start
```

Server runs on `http://localhost:3033` (configurable via `PORT`).

## API Endpoints

### Health Check

#### `GET /health`

Server status endpoint - returns uptime, memory usage, node version, and environment.

**Response:**

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2026-04-15T10:30:00.000Z",
  "node": "v22.12.0",
  "memory": {
    "rss": "45MB",
    "heapUsed": "28MB"
  },
  "environment": "development"
}
```

---

### Session Types

#### `GET /api/sessions`

Lists the 3 AstroLumina session types with their Cal.com event type status. The primary endpoint for the frontend to display available sessions.

**Response:**

```json
{
  "sessions": [
    {
      "key": "astrograma-natala-si-karmica",
      "title": "Astrograma Natală și Karmică",
      "slug": "astrograma-natala-si-karmica",
      "description": "Sesiune live în care aducem claritate...",
      "durationMinutes": 120,
      "price": 75,
      "currency": "EUR",
      "eventTypeId": 5119833,
      "isConfigured": true,
      "location": { "type": "integration", "integration": "cal-video" },
      "questions": {
        "phone": "Număr telefon",
        "birthDate": "Data nașterii (zi/lună/an)",
        "birthPlace": "Locul nașterii (oraș, județ, țară)",
        "birthTime": "Ora nașterii (format 24h sau AM/PM specificat)"
      }
    }
  ]
}
```

---

#### `GET /api/event-types`

Lists all Cal.com event types on the account.

#### `GET /api/event-types/:id`

Get a specific event type by Cal.com ID.

---

### Availability

#### `GET /api/availability/slots?eventTypeId=...&startTime=...&endTime=...`

Returns available booking slots for a given event type and date range.

**Query Parameters:**

| Parameter | Required | Description | Default |
|-----------|----------|-------------|---------|
| `eventTypeId` | Yes | Cal.com event type ID | — |
| `startTime` | Yes | ISO 8601 start of range | — |
| `endTime` | Yes | ISO 8601 end of range | — |
| `timeZone` | No | IANA timezone | `Europe/Bucharest` |

**Example:**

```bash
curl "http://localhost:3033/api/availability/slots?eventTypeId=5119833&startTime=2026-04-20T00:00:00Z&endTime=2026-04-27T23:59:59Z"
```

**Response:**

```json
{
  "slots": {
    "2026-04-21": [
      { "start": "2026-04-21T09:00:00Z", "end": "2026-04-21T11:00:00Z" },
      { "start": "2026-04-21T14:00:00Z", "end": "2026-04-21T16:00:00Z" }
    ],
    "2026-04-22": [
      { "start": "2026-04-22T10:00:00Z", "end": "2026-04-22T12:00:00Z" }
    ]
  }
}
```

---

#### `GET /api/availability/slots/session/:sessionKey`

Convenience endpoint — resolves a session key to a Cal.com event type ID and returns available slots.

**Valid session keys:** `astrograma-natala-si-karmica`, `astrograma-relationala`, `astrograma-previzionala`

**Example:**

```bash
curl "http://localhost:3033/api/availability/slots/session/astrograma-natala-si-karmica?startTime=2026-04-20T00:00:00Z&endTime=2026-04-27T23:59:59Z"
```

---

### Bookings

#### `GET /api/bookings`

List bookings with optional filtering.

**Query Parameters:**

| Parameter | Description | Values |
|-----------|-------------|--------|
| `status` | Filter by booking status | `upcoming`, `past`, `cancelled`, `unconfirmed` |
| `attendeeEmail` | Filter by attendee email | string |
| `eventTypeId` | Filter by event type | number |
| `afterStart` | Bookings starting after this date | ISO 8601 |
| `beforeEnd` | Bookings ending before this date | ISO 8601 |
| `take` | Number of results | number |
| `skip` | Pagination offset | number |

**Example:**

```bash
curl "http://localhost:3033/api/bookings?status=upcoming&take=10"
```

---

#### `GET /api/bookings/:uid`

Get a specific booking by its Cal.com UID.

---

#### `POST /api/bookings`

Create a new booking.

**Request Body:**

```json
{
  "sessionKey": "astrograma-natala-si-karmica",
  "start": "2026-04-21T10:00:00.000Z",
  "attendee": {
    "name": "Maria Popescu",
    "email": "maria@example.com",
    "timeZone": "Europe/Bucharest",
    "phoneNumber": "+40712345678"
  },
  "metadata": {
    "source": "website"
  },
  "bookingFieldsResponses": {
    "phone": "+40712345678",
    "birth-date": "15.03.1990",
    "birth-place": "București, România",
    "birth-time": "14:30"
  }
}
```

**Notes:**
- Use either `sessionKey` (recommended) or `eventTypeId` to specify the session type
- Zoom video link is automatically added as the meeting location
- Birth chart data is collected via `bookingFieldsResponses`

**Response:** `201 Created` with the booking object.

---

#### `PATCH /api/bookings/:uid/reschedule`

Reschedule an existing booking.

**Request Body:**

```json
{
  "start": "2026-04-22T14:00:00Z",
  "rescheduledBy": "maria@example.com",
  "reschedulingReason": "Conflict with work schedule"
}
```

---

#### `DELETE /api/bookings/:uid`

Cancel a booking.

**Request Body (optional):**

```json
{
  "reason": "Schedule conflict"
}
```

---

### Email

#### `POST /api/send-email`

Send a templated email.

**Request Body:**

```json
{
  "to": "client@example.com",
  "type": "ghid-saturn"
}
```

**Available templates:**
- `ghid-saturn` — Saturn in Aries guide
- `soarele-stralucirea-ta` — Sun sign gift

---

#### `POST /api/send-email-with-attachments`

Send an email with PDF attachments downloaded from R2 storage. PDFs are downloaded to a temp directory, attached to the email, and automatically deleted after sending.

**Request Body:**

```json
{
  "to": "client@example.com",
  "subject": "Your Birth Chart Analysis",
  "html": "<p>Please find your birth chart analysis attached.</p>",
  "attachments": [
    "chart-123.pdf"
  ]
}
```

**Attachment options:**
- Full URL: `"https://pub-3a468a81beab43daa28dba00d60409d6.r2.dev/pdfs/chart-123.pdf"`
- Just filename: `"chart-123.pdf"` (uses R2_BASE_URL)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "abc123..."
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CALCOM_API_KEY` | Yes | — | Cal.com API key with bookings/write permissions |
| `CALCOM_BASE_URL` | No | `https://api.cal.com` | Cal.com API base URL |
| `PORT` | No | `3033` | Server listen port |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `CORS_ORIGINS` | No | *(see below)* | Comma-separated allowed CORS origins |
| `SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `SENTRY_RELEASE` | No | — | Sentry release identifier |
| `RESEND_API_KEY` | No | — | Resend API key for sending emails (starts with `re_`) |
| `R2_BASE_URL` | No | *(see below)* | Cloudflare R2 base URL for PDF attachments |

**Default R2 Base URL:** `https://pub-3a468a81beab43daa28dba00d60409d6.r2.dev/pdfs`

### Default CORS Origins

The API allows requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:3033` (Booking API dev)
- `https://astrolumina.pages.dev`
- `https://development.astrolumina.pages.dev`
- `https://carmenilie.com`, `https://www.carmenilie.com`
- `https://carmenilieastrolog.com`, `https://www.carmenilieastrolog.com`
- `https://astrolumina.com`, `https://www.astrolumina.com`

Override with `CORS_ORIGINS` environment variable.

---

## Cal.com API Versions

The API uses different Cal.com API versions per resource:

| Resource | API Version |
|----------|-------------|
| Event Types | `2024-06-14` |
| Availability / Slots | `2024-09-04` |
| Bookings | `2026-02-25` |

---

## Project Structure

```
src/
├── config/
│   ├── env.ts                  # Zod-validated environment config
│   └── session-slugs.ts        # Session key → Cal.com slug mapping
├── middleware/
│   ├── security.ts             # Helmet, CORS, rate limiter
│   └── error-handler.ts        # Custom error types + global handler
├── routes/
│   ├── health.ts               # Health check endpoint
│   ├── event-types.ts          # Event types + sessions listing
│   ├── bookings.ts             # Booking CRUD + reschedule + cancel
│   ├── availability.ts         # Available slots lookup
│   └── email.ts                # Email sending with R2 attachments
├── services/
│   └── calcom.ts               # Cal.com API client (axios)
├── types/
│   └── calcom.ts               # Cal.com TypeScript interfaces
├── instrument.ts               # Sentry initialization
└── server.ts                   # Express app + graceful shutdown
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22.x |
| Language | TypeScript 5.8 (strict mode) |
| Framework | Express 5.x (ES Modules) |
| HTTP Client | Axios |
| Validation | Zod |
| Monitoring | Sentry + Profiling |
| Security | Helmet, CORS, Rate Limiting (30 req/min/IP) |
| Scheduling | Cal.com API v2 |
| Email | Resend |
| Storage | Cloudflare R2 (PDF attachments) |

---

## Security Features

- **Helmet** — Secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **Rate limiting** — 30 requests/minute/IP (configurable)
- **CORS** — Explicit origin whitelist
- **Request body limit** — 1MB max (413 Payload Too Large on exceed)
- **Zod validation** — Input validation at every endpoint
- **Environment validation** — App fails fast with clear errors if config invalid
- **Sentry PII scrubbing** — API keys redacted from error reports

---

## Development

```bash
# Type checking
npm run typecheck

# Build for production
npm run build

# Clean reinstall
npm run clean && npm install
```

---

## Part of AstroLumina

| Service | Port | Repository |
|---------|------|------------|
| Astrology API | 3031 | `AstroLumina-AstrologyAPI` |
| Payment API | 3032 | `AstroLumina-PaymentAPI` |
| Booking API | 3033 | `AstroLumina-BookingAPI` |
| Frontend | 5173 | `AstroLumina-Frontend` |

---

## License

Proprietary — AstroLumina