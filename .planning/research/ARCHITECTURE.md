# Architecture Patterns for Production API Improvements

**Domain:** Backend API Enhancement (Express/TypeScript)
**Researched:** 2026-03-30
**Project:** AstroLumina Booking API

## Overview

This document outlines the architecture for adding four production improvements to an existing Express/TypeScript booking API: testing infrastructure, API authentication, caching layer, and resilience patterns. Each improvement builds upon the previous one in a logical dependency order.

## Current Architecture Baseline

The existing system follows a three-layer architecture:

```
Routes Layer → Service Layer → External API (Cal.com)
```

Improvements will extend this foundation with dedicated infrastructure layers that integrate seamlessly without breaking existing functionality.

---

## Component Boundaries

### 1. Testing Infrastructure

| Component | Responsibility | Boundary |
|-----------|---------------|----------|
| **Test Runner** | Executes test suites, manages environment | Jest - isolated from production code |
| **Test Utilities** | Shared helpers (fixtures, mocks, factories) | `src/__tests__/utils/` |
| **Mock Server** | Simulates Cal.com API responses | Standalone ormswagger-based |
| **Test Database** | Isolated data for integration tests | In-memory or Docker container |

**Key files to create:**
- `jest.config.js` — Test runner configuration
- `src/__tests__/unit/` — Unit tests for services and utilities
- `src/__tests__/integration/` — API endpoint tests
- `src/__tests__/mocks/` — Mock implementations
- `src/__tests__/fixtures/` — Test data factories

### 2. Authentication Layer

| Component | Responsibility | Boundary |
|-----------|---------------|----------|
| **Auth Guard** | Validates incoming requests | Express middleware |
| **Token Validator** | Verifies JWT/API key signatures | Service called by guard |
| **Key Rotation** | Manages API key lifecycle | Separate from auth guard |
| **Permission Matrix** | Maps roles to allowed endpoints | Configuration-driven |

**Key files to create:**
- `src/middleware/auth.ts` — Authentication middleware
- `src/services/auth.ts` — Token/key validation logic
- `src/config/auth.ts` — Auth configuration

**Auth Decision Matrix:**

| Auth Method | Use Case | Complexity | Recommended For |
|-------------|----------|-----------|----------------|
| JWT | Stateful auth with sessions | Medium | Future user accounts |
| API Key | Service-to-service | Low | BFF pattern with frontend |
| Bearer Token | Stateless API access | Low | This project (frontend BFF) |

**Recommendation:** Use Bearer token (JWT) for frontend BFF pattern. The frontend will pass a token that this API validates. This is simpler than API keys and more appropriate than full OAuth.

### 3. Caching Layer

| Component | Responsibility | Boundary |
|-----------|---------------|----------|
| **Cache Store** | Data persistence (Redis or in-memory) | `src/cache/` |
| **Cache Middleware** | Request-level cache check | Express middleware |
| **Cache Invalidator** | Manual and TTL-based invalidation | Service layer |
| **Cache Key Generator** | Normalizes request params to keys | Utility |

**Key files to create:**
- `src/cache/store.ts` — Abstraction over cache backend
- `src/cache/middleware.ts` — Caching middleware
- `src/cache/invalidator.ts` — Cache invalidation logic

**Caching Strategy Options:**

| Strategy | TTL | Invalidation | Best For |
|----------|-----|--------------|----------|
| Cache-aside | 5-15 min | Manual + TTL | Availability slots (frequently read, rarely written) |
| Write-through | N/A | Immediate | Booking creation (consistency critical) |
| Stale-while-revalidate | 5-30 min | Background refresh | Event types (slow-changing) |

**Recommendation:** Use cache-aside with Redis for availability endpoints. In-memory cache (node-cache) acceptable for single-instance deployments.

### 4. Resilience Layer

| Component | Responsibility | Boundary |
|-----------|---------------|----------|
| **Circuit Breaker** | Prevents cascade failures | Wrapper around Cal.com client |
| **Retry Logic** | Handles transient failures | Decorator on HTTP calls |
| **Rate Limiter** | Prevents API quota exhaustion | Already exists, enhance if needed |
| **Timeout Handler** | Prevents hanging requests | Global timeout middleware |

**Key files to create:**
- `src/resilience/circuit-breaker.ts` — Circuit breaker implementation
- `src/resilience/retry.ts` — Retry with exponential backoff
- `src/resilience/decorators.ts` — Wrapper utilities

**Resilience Pattern Configuration:**

| Pattern | Threshold | Action | Recovery |
|---------|-----------|--------|----------|
| Circuit Breaker | 5 failures/30s | Open (fail fast) | Half-open after 60s |
| Retry | 3 attempts | Exponential backoff | 1s, 2s, 4s delays |
| Timeout | 10s per request | Fail with 504 | Return cached if available |

---

## Data Flow

### With All Improvements

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                             │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 1. AUTHENTICATION LAYER                                             │
│    - Extract token from Authorization header                         │
│    - Validate token signature                                         │
│    - Attach user to request object                                    │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. CACHING LAYER (GET requests only)                                 │
│    - Generate cache key from request params                           │
│    - Check cache store (Redis/in-memory)                              │
│    - Return cached response if hit → skip to Response               │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                            Cache MISS
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. ROUTE HANDLER                                                     │
│    - Parse and validate input (Zod)                                   │
│    - Transform to service-layer format                               │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. SERVICE LAYER                                                     │
│    - Call Cal.com API client                                          │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. RESILIENCE LAYER (wrapping external calls)                        │
│    - Retry with backoff (if transient failure)                        │
│    - Circuit breaker (if Cal.com unhealthy)                           │
│    - Timeout enforcement                                              │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. CAL.COM API (external)                                            │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. CACHE WRITE (on response)                                         │
│    - Store response with TTL                                         │
│    - Set invalidation keys                                            │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. RESPONSE                                                          │
│    - Transform Cal.com response to API format                        │
│    - Return JSON to client                                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Request Flow with Caching Hit

When a cache hit occurs (steps 1-2), the flow short-circuits:

```
Request → Auth → Cache HIT → Response
         (step 1)   (step 2)
```

This significantly reduces latency for repeated availability queries.

---

## Suggested Build Order

### Phase 1: Testing Infrastructure (Foundation)

**Rationale:** Testing must exist before adding new code. Without tests, any addition risks breaking existing functionality.

**Dependencies:** None — pure addition

**Work items:**
1. Set up Jest configuration
2. Create test utilities and mock factories
3. Write unit tests for existing services (calcom.ts)
4. Write integration tests for existing routes
5. Set up CI test pipeline

**Deliverable:** >80% test coverage on critical paths

### Phase 2: Authentication Layer

**Rationale:** Authentication should be in place before exposing new features. Adding auth after other features requires updating all existing tests.

**Dependencies:** Testing infrastructure (tests validate auth behavior)

**Work items:**
1. Create auth middleware
2. Implement JWT validation service
3. Add auth to all routes (progressive rollout)
4. Update tests to include auth headers

**Deliverable:** All API endpoints require valid authentication

### Phase 3: Caching Layer

**Rationale:** With tests and auth in place, caching can be added safely. Cache behavior must be tested.

**Dependencies:** Testing infrastructure, Authentication (cache keys should include auth context)

**Work items:**
1. Set up Redis (or node-cache for in-memory)
2. Create cache abstraction layer
3. Add caching to GET endpoints (availability slots, event types)
4. Implement cache invalidation
5. Add cache metrics

**Deliverable:** 50%+ cache hit rate on availability queries

### Phase 4: Resilience Layer

**Rationale:** Resilience patterns wrap external dependencies. With caching, the circuit breaker has a fallback (serve stale cache).

**Dependencies:** Testing infrastructure, Caching (fallback data source)

**Work items:**
1. Implement circuit breaker around Cal.com client
2. Add retry logic with exponential backoff
3. Add global timeout handling
4. Add health endpoint showing circuit breaker state
5. Set up alerts for circuit breaker state changes

**Deliverable:** Graceful degradation when Cal.com is unavailable

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     TESTING (Phase 1)                        │
│  - No dependencies                                           │
│  - Enables safe addition of all subsequent features         │
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│  AUTHENTICATION (Phase 2) │  │   CACHING (Phase 3)       │
│  - Depends on testing     │  │  - Depends on testing     │
│  - Validates requests     │  │  - Requires cache store   │
└───────────────────────────┘  └───────────────────────────┘
            │                             │
            └──────────────┬──────────────┘
                           ▼
              ┌───────────────────────────┐
              │  RESILIENCE (Phase 4)     │
              │  - Depends on testing     │
              │  - Caching as fallback    │
              └───────────────────────────┘
```

---

## Component Interaction Summary

| From → To | Relationship |
|-----------|--------------|
| Route → Auth Middleware | Route calls middleware before handler |
| Route → Cache Middleware | Cache middleware wraps route |
| Service → Resilience Wrapper | Service calls wrapped Cal.com client |
| Cache → Auth | Cache key includes authenticated user context |
| Resilience → Cache | Circuit breaker can return stale cache on failure |

---

## Scalability Considerations

| Scale | Testing | Authentication | Caching | Resilience |
|-------|---------|----------------|---------|------------|
| Single instance | Local Jest | In-memory validation | node-cache | In-process circuit breaker |
| Multi-instance | Same | Redis-backed sessions | Redis required | Distributed circuit breaker (e.g., Redis) |
| High traffic | Parallel test execution | Token validation caching | Redis cluster | Circuit breaker with shared state |

---

## Sources

- [Express.js Best Practices: Building Production-Ready Node.js Backend Applications](https://yennj12.js.org/yennj12_blog_V4/posts/express-nodejs-backend-framework-best-practices/) (2025-11)
- [Authentication Strategies in Express: Practical Patterns](https://thelinuxcode.com/authentication-strategies-in-express-practical-patterns-pitfalls-and-production-ready-defaults/) (2026-02)
- [Express.js Middleware Patterns: Authentication and Authorization](https://www.grizzlypeaksoftware.com/library/expressjs-middleware-patterns-authentication-and-authorization-e0hbci84) (2026-02)
- [6 Redis Caching Patterns That Cut Node.js API Response Time from 1.5s to 150ms](https://dev.to/jsgurujobs/6-redis-caching-patterns-that-cut-nodejs-api-response-time-from-15s-to-150ms-4944) (2026-03)
- [How to Build Resilient APIs with Circuit Breaker, Bulkhead & Retry Patterns in Node.js](https://dev.to/1xapi/how-to-build-resilient-apis-with-circuit-breaker-bulkhead-retry-patterns-in-nodejs-2026-guide-mkf) (2026-03)
- [Integration Testing Patterns with Express.js](https://www.grizzlypeaksoftware.com/library/integration-testing-patterns-with-expressjs-4wwpq5s3) (2026-02)
