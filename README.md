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

## Quick Start

```bash
# Install dependencies
npm install

# Development (auto-reload with tsx)
npm run dev

# Production build
npm run build
npm start
```

Server runs on `http://localhost:3031` (configurable via `PORT`).

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
curl "http://localhost:3031/api/availability/slots?eventTypeId=5119833&startTime=2026-04-20T00:00:00Z&endTime=2026-04-27T23:59:59Z"
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
curl "http://localhost:3031/api/availability/slots/session/astrograma-natala-si-karmica?startTime=2026-04-20T00:00:00Z&endTime=2026-04-27T23:59:59Z"
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
curl "http://localhost:3031/api/bookings?status=upcoming&take=10"
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

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CALCOM_API_KEY` | Yes | — | Cal.com API key with bookings/write permissions |
| `CALCOM_BASE_URL` | No | `https://api.cal.com` | Cal.com API base URL |
| `PORT` | No | `3031` | Server listen port |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `CORS_ORIGINS` | No | *(see below)* | Comma-separated allowed CORS origins |
| `SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `SENTRY_RELEASE` | No | — | Sentry release identifier |

### Default CORS Origins

The API allows requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:3031` (Booking API dev)
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
│   └── session-slugs.ts         # Session key → Cal.com slug mapping
├── middleware/
│   ├── security.ts             # Helmet, CORS, rate limiter
│   └── error-handler.ts       # Custom error types + global handler
├── routes/
│   ├── health.ts              # Health check endpoint
│   ├── event-types.ts        # Event types + sessions listing
│   ├── bookings.ts           # Booking CRUD + reschedule + cancel
│   └── availability.ts        # Available slots lookup
├── services/
│   └── calcom.ts              # Cal.com API client (axios)
├── types/
│   └── calcom.ts             # Cal.com TypeScript interfaces
├── instrument.ts              # Sentry initialization
└── server.ts                 # Express app + graceful shutdown
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