# AstroLumina Booking API

Cal.com booking management for the AstroLumina astrological services platform — session scheduling, availability, and booking lifecycle.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-green.svg)](https://expressjs.com/)
[![Node](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Cal.com](https://img.shields.io/badge/Cal.com-2024.08.13-111827.svg)](https://cal.com/)

## Overview

Manages online astrological session bookings via the Cal.com API. Provides endpoints for listing session types, checking available time slots, creating/rescheduling/cancelling bookings, and syncing event types from Cal.com.

| Session | Duration | Price | Description |
|---------|----------|-------|-------------|
| **Astrograma Natală și Karmică** | 120 min | €75 | Birth chart analysis — personality, purpose, talents, blocks, and transgenerational patterns |
| **Astrograma Relațională** | 90 min | €75 | Relationship dynamics — synastry, compatibility, karmic lessons between two people |
| **Astrograma Previzională** | 90 min | €75 | 12-month forecast — favorable periods for career, relationships, decisions, and projects |

## Quick Start

```bash
# Install dependencies
npm install

# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

Server runs on `http://localhost:3031`.

## API Endpoints

### `GET /health`

Server status, uptime, and memory usage.

### `GET /api/sessions`

Lists the 3 AstroLumina session types with their Cal.com event type status.

**Response:**

```json
{
  "sessions": [
    {
      "key": "astrograma-natala-si-karmica",
      "title": "Astrograma Natală și Karmică",
      "slug": "astrograma-natala-si-karmica",
      "durationMinutes": 120,
      "price": 75,
      "currency": "EUR",
      "eventTypeId": 5119833,
      "isConfigured": true
    }
  ]
}
```

### `GET /api/event-types`

Lists all Cal.com event types on the account.

### `GET /api/event-types/:id`

Get a specific event type by Cal.com ID.

### `GET /api/availability/slots?eventTypeId=...&startTime=...&endTime=...`

Returns available booking slots for a given event type and date range.

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `eventTypeId` | Yes | Cal.com event type ID |
| `startTime` | Yes | ISO 8601 start of range |
| `endTime` | Yes | ISO 8601 end of range |
| `timeZone` | No | Defaults to `Europe/Bucharest` |

### `GET /api/availability/slots/session/:sessionKey`

Convenience endpoint — resolves a session key to a Cal.com event type and returns slots.

**Valid keys:** `astrograma-natala-si-karmica`, `astrograma-relationala`, `astrograma-previzionala`

**Example:**

```bash
curl "http://localhost:3031/api/availability/slots/session/astrograma-natala-si-karmica?startTime=2026-04-01T00:00:00Z&endTime=2026-04-07T23:59:59Z"
```

### `GET /api/bookings`

List bookings. Supports filtering:

| Query param | Description |
|-------------|-------------|
| `status` | `upcoming`, `past`, `cancelled`, `unconfirmed` |
| `attendeeEmail` | Filter by attendee email |
| `eventTypeId` | Filter by event type |
| `afterStart` | ISO 8601 — bookings after this date |
| `beforeEnd` | ISO 8601 — bookings before this date |
| `take` | Number of results to return |
| `skip` | Pagination offset |

### `GET /api/bookings/:uid`

Get a specific booking by its UID.

### `POST /api/bookings`

Create a new booking.

**Body:**

```json
{
  "eventTypeId": 5119833,
  "start": "2026-04-01T10:00:00Z",
  "attendee": {
    "name": "Maria Popescu",
    "email": "maria@example.com",
    "timeZone": "Europe/Bucharest",
    "phoneNumber": "+40712345678"
  },
  "metadata": { "source": "stan-store" },
  "bookingFieldsResponses": {
    "phone": "+40712345678",
    "birth-date": "15.03.1990",
    "birth-place": "București, România",
    "birth-time": "14:30"
  }
}
```

**Response:** `201 Created` with the booking object.

### `PATCH /api/bookings/:uid/reschedule`

Reschedule an existing booking.

**Body:**

```json
{
  "start": "2026-04-02T14:00:00Z",
  "rescheduledBy": "maria@example.com",
  "reschedulingReason": "Conflict with work schedule"
}
```

### `DELETE /api/bookings/:uid`

Cancel a booking. Optional body: `{ "reason": "Schedule conflict" }`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CALCOM_API_KEY` | Yes | — | Cal.com API key |
| `CALCOM_API_VERSION` | No | `2024-08-13` | Cal.com API version |
| `CALCOM_BASE_URL` | No | `https://api.cal.com` | Cal.com API base URL |
| `PORT` | No | `3031` | Server listen port |
| `NODE_ENV` | No | `development` | Environment mode |
| `CORS_ORIGINS` | No | *(hardcoded)* | Comma-separated allowed origins |
| `SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `SENTRY_RELEASE` | No | — | Sentry release identifier |

## Project Structure

```
src/
├── config/env.ts               # Zod-validated environment config
├── instrument.ts               # Sentry initialization
├── middleware/
│   ├── security.ts             # Helmet, CORS, rate limiter
│   └── error-handler.ts        # Error types and handlers
├── routes/
│   ├── health.ts               # Health check
│   ├── event-types.ts          # Event types + sessions listing
│   ├── bookings.ts             # Booking CRUD + reschedule + cancel
│   └── availability.ts         # Available slots
├── services/
│   └── calcom.ts               # Cal.com API client (axios)
├── types/
│   └── calcom.ts               # Cal.com TypeScript interfaces
└── server.ts                   # App entry + graceful shutdown
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript 5.8 (strict mode) |
| Framework | Express 5.x |
| Scheduling | Cal.com API v2 (2024-08-13) |
| HTTP client | Axios |
| Validation | Zod |
| Monitoring | Sentry (error tracking + profiling) |
| Security | Helmet, CORS, Rate Limiting |

## Security

- **Helmet** — secure HTTP headers
- **Rate limiting** — 30 requests/minute/IP
- **CORS** — explicit origin whitelist
- **1MB body limit** — rejects oversized payloads with 413
- **Sentry PII scrubbing** — Cal.com API keys redacted from error reports
- **Zod validation** — input validation at every endpoint
- **Environment validation** — app won't start with invalid config

## Part of AstroLumina

| Service | Port | Repository |
|---------|------|------------|
| Astrology API | 3031 | `AstroLumina-AstrologyAPI` |
| Payment API | 3032 | `AstroLumina-PaymentAPI` |
| Booking API | 3033 | `AstroLumina-BookingAPI` |
| Frontend | 5173 | `AstroLumina-Frontend` |
