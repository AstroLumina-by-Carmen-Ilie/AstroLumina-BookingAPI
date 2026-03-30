# Project Research Summary

**Project:** AstroLumina Booking API
**Domain:** Backend API Production Improvements
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

This is a production-readiness enhancement project for an existing Express 5.x + TypeScript booking API that wraps Cal.com. The current API is functional but lacks testing, authentication, caching, and resilience patterns needed for production operation. Research across four dimensions—technology stack, feature requirements, architectural patterns, and common pitfalls—converges on a clear four-phase implementation approach.

The recommended approach prioritizes **testing as the foundation** (Phase 1), followed by **API authentication** (Phase 2), **caching layer** (Phase 3), and **resilience patterns** (Phase 4). This ordering follows natural dependencies: tests enable safe feature addition, auth protects new endpoints, caching improves performance, and resilience patterns wrap external dependencies with caching as a fallback. Key risks include over-reliance on mocked unit tests, authentication vulnerabilities, cache stampede on availability queries, and circuit breakers that never recover. These are well-documented pitfalls with proven mitigation strategies.

## Key Findings

### Recommended Stack

The recommended technology stack is modern, well-supported, and optimized for 2026 Node.js development.

**Core technologies:**
- **Vitest** (4.1.2) — Test runner with Vite-native speed (10-20x faster than Jest), native ESM support, and nearly identical Jest API. Chosen over Jest for new TypeScript projects.
- **supertest** (7.2.2) — HTTP API testing, de facto standard for Express integration testing.
- **node-cache-manager** (7.2.8) — Multi-store caching abstraction supporting both in-memory and Redis backends.
- **ioredis** (^5.4.0) — Most popular Node.js Redis client with connection pooling.
- **opossum** (9.0.0) — Red Hat-maintained circuit breaker with fail-fast, fallback support, and event emission.
- **axios-retry** (4.5.0) — Automatic retry with exponential backoff for Axios HTTP calls.

**What NOT to use:**
- Jest for new projects (Vitest is faster and more modern)
- node-cache npm package (abandoned, no TypeScript)
- Custom circuit breaker implementations (opossum is battle-tested)

### Expected Features

**Must have (table stakes):**
- **API Authentication** — Currently unauthenticated; any client can call endpoints. Recommended: API Keys via `X-API-Key` header (simpler than JWT for server-to-server).
- **Test Coverage** — No tests exist. Need >80% coverage on critical paths (booking creation, availability queries).
- **Retry Logic** — Handle transient Cal.com failures with exponential backoff (3 attempts, 1s/2s/3s delays).
- **Circuit Breaker** — Prevent cascading failures when Cal.com is down. Configure: 50% failure threshold, 30s reset timeout.
- **Caching for Availability** — Cache slot queries to reduce Cal.com API calls. TTL: 2-5 minutes for availability, 30 minutes for event types.
- **Metrics Endpoint** — Prometheus-compatible `/metrics` endpoint for operational monitoring.

**Should have (differentiators):**
- **Stale-while-revalidate caching** — Return cached data immediately, refresh in background. Reduces perceived latency.
- **Request deduplication** — Multiple users querying same slots trigger single Cal.com call (thundering herd prevention).
- **Per-client rate limiting** — Different limits per API key for tiered service.

**Defer (v2+):**
- OAuth2 (Cal.com handles their auth)
- User accounts (Cal.com manages)
- Payment processing (separate service)
- Webhooks (Cal.com handles)
- Distributed tracing (complex, needs metrics first)

### Architecture Approach

The architecture follows a four-layer model extending the existing three-layer design (Routes → Service → External API):

1. **Authentication Layer** — Express middleware validating API keys, selective application to protected routes only.
2. **Caching Layer** — Middleware-based cache-aside pattern with Redis (production) or in-memory (development). Keys include auth context.
3. **Resilience Layer** — Wrapper around Cal.com client with circuit breaker and retry logic.
4. **Metrics Layer** — Prometheus endpoint exposing request counts, latencies, cache hit rates, circuit breaker state.

**Data flow:** Request → Auth → Cache (check) → Route Handler → Service → Resilience Wrapper → Cal.com API → Cache (write) → Response.

### Critical Pitfalls

1. **False confidence from mocked tests** — Unit tests with heavy mocking verify code executes paths, not that paths work. Prevention: Prioritize integration tests with supertest testing actual HTTP responses.

2. **Authentication creating attack surface** — Tokens in localStorage, no expiration, same secret for all envs. Prevention: Use httpOnly cookies, short-lived tokens (15 min), server-side refresh token storage.

3. **Cache stampede on availability queries** — All cache entries expire simultaneously, triggering thousands of Cal.com calls. Prevention: Jitter TTL by ±10%, request coalescing, probabilistic early expiration.

4. **Circuit breaker that never recovers** — Circuit stays open permanently after outage. Prevention: Use opossum with three states (closed/open/half-open), configure 50% failure threshold over 10s, 30s reset, log state changes.

5. **Retry logic compounding outages** — 1000 users retrying 3x = 3000 requests to failing service. Prevention: Exponential backoff with jitter, limit to 3-5 attempts, circuit breaker stops retries when service is down.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Testing Infrastructure
**Rationale:** Testing must exist before adding new code. Without tests, any addition risks breaking existing functionality. This is the foundation for all subsequent phases.

**Delivers:**
- Vitest + supertest configuration
- Unit tests for services (calcom.ts client, validators)
- Integration tests for all API endpoints
- Mock server for Cal.com API responses
- CI pipeline configuration

**Addresses:** Test Coverage (FEATURES.md table stakes)

**Avoids:** Pitfall 1 (false confidence tests), Pitfall 8 (tests failing in CI)

**Research flag:** Standard patterns — testing Express APIs is well-documented. Minimal additional research needed.

---

### Phase 2: Authentication Layer
**Rationale:** Authentication should be in place before exposing new features. Adding auth after other features requires updating all existing tests. Also, caching keys should include auth context—adding auth later means cache invalidation.

**Delivers:**
- API key validation middleware (`X-API-Key` header)
- Selective route protection (health, metrics, seed endpoints remain public)
- Service-to-service auth for backend calls

**Addresses:** API Authentication (FEATURES.md table stakes), Per-client rate limiting (differentiator)

**Avoids:** Pitfall 2 (auth vulnerabilities), Pitfall 7 (breaking existing endpoints)

**Research flag:** Standard patterns — API key auth is well-established. Confirm key rotation mechanism details during planning.

---

### Phase 3: Caching Layer
**Rationale:** With tests and auth in place, caching can be added safely. Cache behavior must be testable. Caching provides fallback data for resilience layer.

**Delivers:**
- node-cache-manager with in-memory (dev) or Redis (prod)
- Caching middleware for GET endpoints
- Cache invalidation on booking create/update/cancel
- Cache metrics (hit rate, miss rate)

**Addresses:** Caching for Availability (FEATURES.md table stakes), Stale-while-revalidate (differentiator), Request deduplication (differentiator)

**Avoids:** Pitfall 3 (cache stampede), Pitfall 6 (stale data), Pitfall 9 (caching without metrics)

**Research flag:** Redis vs in-memory decision needed based on deployment scale. Well-documented patterns.

---

### Phase 4: Resilience Layer
**Rationale:** Resilience patterns wrap external dependencies. With caching in place, circuit breaker has a fallback (serve stale cache) when Cal.com is down.

**Delivers:**
- Opossum circuit breaker around Cal.com client
- axios-retry with exponential backoff (3 attempts: 1s, 2s, 3s)
- Global timeout handling (10s per request)
- Circuit breaker state in health/metrics endpoint

**Addresses:** Retry Logic (FEATURES.md table stakes), Circuit Breaker (FEATURES.md table stakes)

**Avoids:** Pitfall 4 (circuit never recovers), Pitfall 5 (retry compounding), Pitfall 10 (resilience without observability)

**Research flag:** Standard patterns with opossum. Verify Cal.com API rate limits during implementation.

---

### Phase Ordering Rationale

- **Testing first** — No dependencies, enables safe development of all subsequent features
- **Auth second** — Tests validate auth behavior; adding later requires retrofit
- **Caching third** — Needs auth context for cache keys; provides fallback for resilience
- **Resilience fourth** — Wraps external calls; caching provides degraded service data

This ordering directly maps to the dependency graph in ARCHITURE.md and avoids all critical pitfalls identified in PITFALLS.md.

---

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Auth):** Key rotation mechanism specifics, API key storage approach (environment vs database)
- **Phase 3 (Caching):** Redis vs in-memory decision based on production deployment model

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Testing):** Vitest + supertest for Express is well-established
- **Phase 4 (Resilience):** Opossum + axios-retry is standard Node.js pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Technologies verified via npm (2026 versions), established standards |
| Features | HIGH | Table stakes well-documented, differentiators are clear |
| Architecture | HIGH | Four-phase approach follows logical dependencies |
| Pitfalls | HIGH | All identified pitfalls have known mitigation strategies |

**Overall confidence:** HIGH

### Gaps to Address

- **JWT vs API Key decision:** FEATURES.md recommends API Keys, but ARCHITECTURE.md suggests Bearer token (JWT). Need to resolve during planning — API Keys simpler for server-to-server, JWT appropriate for BFF pattern.
- **Redis deployment model:** Whether to use Redis (multi-instance) or in-memory (single instance) caching depends on planned deployment. Recommend starting with in-memory, adding Redis only if needed.
- **Cal.com rate limits:** Circuit breaker and retry logic should respect Cal.com's actual rate limits. Verify during Phase 4 implementation.

## Sources

### Primary (HIGH confidence)
- **npm packages:** vitest 4.1.2, supertest 7.2.2, cache-manager 7.2.8, opossum 9.0.0, axios-retry 4.5.0 — verified versions as of March 2026
- **PkgPulse/DevTools:** Vitest vs Jest 2026 comparison — confirms Vitest as standard for new TypeScript projects

### Secondary (HIGH confidence)
- **DEV Community:** "API Authentication Done Right" — API key patterns
- **Grizzly Peak Software:** "Integration Testing Patterns with Express.js" — test pyramid
- **DEV Community:** "Circuit Breaker & Retry Patterns in Node.js" — resilience patterns
- **DEV Community:** "Redis Caching Patterns" — cache-aside, stale-while-revalidate

### Tertiary (MEDIUM confidence)
- **OneUptime blogs:** Additional authentication and caching patterns (need validation during implementation)

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
