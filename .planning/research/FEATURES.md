# Feature Landscape: Booking API Improvements

**Domain:** Backend API (Express/TypeScript)
**Researched:** 2026-03-30
**Context:** Production-readiness improvements for Cal.com-wrapped booking API

---

## Table Stakes

Features users expect. Missing = product feels incomplete or insecure.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **API Authentication** | Currently unauthenticated; any client can call endpoints | Medium | None |
| **Test Coverage** | No tests exist; booking API needs reliability | High | Auth (for testing protected routes) |
| **Retry Logic** | Cal.com API failures will happen; need graceful handling | Low | None |
| **Circuit Breaker** | Prevent cascading failures when Cal.com is down | Medium | Retry logic |
| **Caching for Availability** | Every slots query hits Cal.com; slow under load | Medium | None |
| **Metrics Endpoint** | Observability needed for production operation | Low | None |

### Feature Details: Table Stakes

#### 1. API Authentication

**What:** Secure the API endpoints that are currently open.

**Recommended approach:** API Keys (not JWT)

| Auth Type | Best For | Why Not This Project |
|-----------|----------|---------------------|
| **API Keys** | Server-to-server, BFF patterns | **RECOMMENDED** — simple, scalable, revokable |
| JWTs | User sessions, short-lived access | No user accounts; adds complexity |
| OAuth2 | Third-party integrations | Overkill; Cal.com handles their auth |

**Implementation:**
- Header: `X-API-Key` 
- Store keys in environment (rotatable)
- Key rotation mechanism (future)

**Sources:**
- DEV Community: "API Authentication Done Right: JWTs, API Keys, and OAuth2 in Production (2026 Guide)" — https://dev.to/young_gao/api-authentication-done-right-jwts-api-keys-and-oauth2-in-production-38a6
- OneUptime: "How to Build API Authentication Patterns" — https://oneuptime.com/blog/post/2026-01-30-how-to-build-api-authentication-patterns/view

---

#### 2. Test Coverage

**What:** Comprehensive test suite for a booking API.

**Recommended stack:**
- **Jest** — test runner (mature, TypeScript support)
- **Supertest** — HTTP assertions for integration tests
- **msw** (Mock Service Worker) — mock Cal.com API responses

**Test pyramid for this project:**

```
        /\
       /  \      E2E (optional)
      /----\     - Critical user flows
     /      \
    /--------\  Integration
   -          - - All API routes
  /------------\ Unit
 -              - - Services, utilities, validation
```

**Coverage targets:**
- Unit: 80%+ for services (Cal.com client, validators)
- Integration: 100% of API endpoints
- Critical paths: booking creation, availability queries

**Test isolation:**
- Mock Cal.com API responses (don't hit real API)
- Clean test database/state between tests
- Parallel test execution

**Sources:**
- Grizzly Peak Software: "Integration Testing Patterns with Express.js" — https://www.grizzlypeaksoftware.com/library/integration-testing-patterns-with-expressjs-4wwpq5s3
- DEV Community: "Writing Test Cases in an Express.js App with TypeScript" — https://medium.com/@shubh435/writing-test-cases-in-an-express-js-app-with-typescript-2b1f98aea230

---

#### 3. Retry Logic

**What:** Automatically retry failed Cal.com API calls.

**Recommended approach:**
- **Library:** `axios-retry` (works with existing axios client)
- **Strategy:** Exponential backoff with jitter
- **Retries:** 3 attempts max
- **Retryable errors:** 5xx, 429, network failures
- **Non-retryable:** 4xx (except 429), validation errors

**Implementation pattern:**
```typescript
import axiosRetry from 'axios-retry';

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 100 + Math.random() * 100,
  retryCondition: (error) => error.response?.status >= 500 || error.response?.status === 429,
});
```

**Sources:**
- 1xAPI: "Circuit Breaker & Retry Patterns in Node.js (2026)" — https://1xapi.com/blog/resilient-api-circuit-breaker-bulkhead-retry-nodejs-2026

---

#### 4. Circuit Breaker

**What:** Stop calling Cal.com when they're experiencing outages.

**Recommended approach:**
- **Library:** `opossum` (Node.js native, framework-agnostic)
- **Failure threshold:** 5 failures in 30 seconds
- **Reset timeout:** 30 seconds before half-open
- **Fallback:** Return cached availability or degraded response

**States:**
```
CLOSED (normal) → OPEN (failing) → HALF-OPEN (testing recovery)
```

**Why opossum over others:**
- Native Promise support
- Works with any async function
- Built-in metrics events

**Sources:**
- DEV Community: "How to Build Resilient APIs with Circuit Breaker, Bulkhead & Retry Patterns in Node.js (2026 Guide)" — https://dev.to/1xapi/how-to-build-resilient-apis-with-circuit-breaker-bulkhead-retry-patterns-in-nodejs-2026-guide-mkf

---

#### 5. Caching for Availability

**What:** Cache Cal.com availability slots to reduce API calls.

**Recommended approach:**
- **Library:** `cache-manager` (multi-layer: memory + Redis)
- **In-memory first:** Fast access, process-scoped
- **Redis fallback:** Distributed caching, persist across restarts

**Cache strategy:**

| Endpoint | Cache Key | TTL | Invalidation |
|----------|-----------|-----|--------------|
| `/api/availability/slots` | `{eventTypeId}:{start}:{end}:{timezone}` | 2-5 min | Time-based |
| `/api/event-types` | `event-types:list` | 30 min | On seed/change |

**Cache-aside pattern:**
1. Check cache
2. On miss → call Cal.com
3. Store in cache
4. Return response

**Stale-while-revalidate (advanced):**
- Return cached data immediately
- Refresh in background
- Reduces perceived latency

**Sources:**
- DEV Community: "6 Redis Caching Patterns That Cut Node.js API Response Time from 1.5s to 150ms" — https://dev.to/jsgurujobs/6-redis-caching-patterns-that-cut-nodejs-api-response-time-from-15s-to-150ms-4944

---

#### 6. Metrics Endpoint

**What:** Expose operational metrics for monitoring.

**Recommended approach:**
- **Library:** `prom-client` + `express-prometheus-middleware`
- **Endpoint:** `GET /metrics`
- **Format:** Prometheus text exposition

**Key metrics to expose:**

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method/status |
| `http_request_duration_seconds` | Histogram | Request latency |
| `calcom_api_calls_total` | Counter | Cal.com API calls by endpoint |
| `calcom_api_duration_seconds` | Histogram | Cal.com API latency |
| `calcom_circuit_breaker_state` | Gauge | 0=closed, 1=open, 2=half-open |
| `cache_hits_total` | Counter | Cache hit/miss ratio |

**Sources:**
- NPM: `@matteodisabatino/express-prometheus-middleware` — https://www.npmjs.com/package/@matteodisabatino/express-prometheus-middleware
- DEV Community: "Prometheus and Grafana Monitoring for a Node.js API" — https://dev.to/addwebsolutionpvtltd/prometheus-and-grafana-monitoring-for-a-nodejs-api-1bn

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Stale-while-revalidate caching** | Faster perceived latency; cache stays fresh | Medium | Caching |
| **Request deduplication** | Reduce Cal.com calls when multiple users query same slots | Low | Caching |
| **Per-client rate limiting** | Different limits for different consumers | Medium | Auth |
| **Structured logging** | Better debugging, log aggregation | Low | None |
| **Distributed tracing** | Trace requests across services | Medium | None |

### Feature Details: Differentiators

#### 1. Stale-while-revalidate Caching

**What:** Return cached data immediately while refreshing in background.

**Benefit:** Sub-50ms response times even when Cal.com is slow.

**Implementation:**
```typescript
const cacheConfig = {
  ttl: 300, // 5 minutes
  staleWhileRevalidate: 600, // Serve stale for 10 min while refreshing
};
```

---

#### 2. Request Deduplication

**What:** When multiple requests arrive for the same Cal.com query, make only one call.

**Benefit:** Reduce Cal.com API usage; prevent thundering herd.

**Implementation:** Use `axios-deduplicate` or in-flight request map.

---

#### 3. Per-client Rate Limiting

**What:** Different rate limits per API key.

**Benefit:** Protect Cal.com from high-traffic clients; allow privileged clients more bandwidth.

**Implementation:**
- Store rate limits in config/env per API key
- Use `express-rate-limit` with custom key generator

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **OAuth2** | Cal.com handles their auth; frontend doesn't need to auth to this API | Keep with API key authentication |
| **User accounts** | Cal.com manages users/sessions | N/A |
| **Payment processing** | Separate Payment API handles this | N/A |
| **Email notifications** | Cal.com sends booking confirmations | N/A |
| **JWT-based auth** | Adds complexity without benefit for server-to-server | Use API keys |
| **Webhooks** | Not needed; Cal.com handles their own webhooks | N/A |

---

## Feature Dependencies

```
API Authentication
    ↓
    ├─→ Per-client rate limiting
    └─→ Test coverage (protected routes)

Caching
    ├─→ Stale-while-revalidate
    └─→ Request deduplication

Retry Logic ──→ Circuit Breaker

Metrics Endpoint (independent, can do anytime)
```

---

## MVP Recommendation

Prioritize in this order:

1. **API Authentication** — Security must come first
2. **Test Coverage** — Enables safe development of other features
3. **Retry + Circuit Breaker** — Protects from Cal.com outages
4. **Caching** — Performance improvement
5. **Metrics** — Observability for production

**Defer:**
- Per-client rate limiting (need auth first)
- Stale-while-revalidate (basic caching first)
- Distributed tracing (complex, need metrics first)

---

## Sources

### Authentication
- DEV Community: "API Authentication Done Right: JWTs, API Keys, and OAuth2 in Production (2026 Guide)" — https://dev.to/young_gao/api-authentication-done-right-jwts-api-keys-and-oauth2-in-production-38a6 — **HIGH**
- OneUptime: "How to Build API Authentication Patterns" — https://oneuptime.com/blog/post/2026-01-30-how-to-build-api-authentication-patterns/view — **MEDIUM**

### Testing
- Grizzly Peak Software: "Integration Testing Patterns with Express.js" — https://www.grizzlypeaksoftware.com/library/integration-testing-patterns-with-expressjs-4wwpq5s3 — **HIGH**
- DEV Community: "Writing Test Cases in an Express.js App with TypeScript" — https://medium.com/@shubh435/writing-test-cases-in-an-express-js-app-with-typescript-2b1f98aea230 — **MEDIUM**

### Resilience Patterns
- 1xAPI: "Circuit Breaker & Retry Patterns in Node.js (2026)" — https://1xapi.com/blog/resilient-api-circuit-breaker-bulkhead-retry-nodejs-2026 — **HIGH**
- DEV Community: "How to Build Resilient APIs with Circuit Breaker, Bulkhead & Retry Patterns in Node.js (2026 Guide)" — https://dev.to/1xapi/how-to-build-resilient-apis-with-circuit-breaker-bulkhead-retry-patterns-in-nodejs-2026-guide-mkf — **HIGH**

### Caching
- DEV Community: "6 Redis Caching Patterns That Cut Node.js API Response Time from 1.5s to 150ms" — https://dev.to/jsgurujobs/6-redis-caching-patterns-that-cut-nodejs-api-response-time-from-15s-to-150ms-4944 — **HIGH**
- OneUptime: "How to Build Multi-Layer Caching with Redis in Node.js" — https://oneuptime.com/blog/post/2026-01-25-multi-layer-caching-redis-nodejs/view — **MEDIUM**

### Metrics
- NPM: "@matteodisabatino/express-prometheus-middleware" — https://www.npmjs.com/package/@matteodisabatino/express-prometheus-middleware — **HIGH**
- DEV Community: "Prometheus and Grafana Monitoring for a Node.js API" — https://dev.to/addwebsolutionpvtltd/prometheus-and-grafana-monitoring-for-a-nodejs-api-1bn — **MEDIUM**
