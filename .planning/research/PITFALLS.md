# Domain Pitfalls: API Improvements for Express/TypeScript

**Domain:** Backend API Improvements (Brownfield Express 5.x + TypeScript)
**Researched:** 2026-03-30
**Context:** Adding testing, authentication, caching, and resilience to existing Cal.com booking API

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or production outages.

### Pitfall 1: Test Coverage That Gives False Confidence

**What goes wrong:** 200+ unit tests pass, API returns 500 on first real request. Tests mocked everything including the bugs.

**Why it happens:** Over-reliance on unit tests with heavy mocking (mocks, stubs). Tests only verify that code executes paths, not that paths work correctly.

**Consequences:** Deploy with confidence, crash in production. Booking failures = lost revenue.

**Prevention:**
- Prioritize integration tests over unit tests for API behavior
- Test actual HTTP responses with supertest, not mocked handlers
- Include Cal.com API simulation (or test against Cal.com sandbox) in integration tests
- Test the entire request/response lifecycle including error handling

**Warning signs:**
- Test files are mostly `*.test.ts` with `jest.mock()`
- No `*.integration.test.ts` files
- Tests mock external services entirely

**Phase mapping:** Testing phase (Phase 1)

---

### Pitfall 2: Authentication That Creates Attack Surface

**What goes wrong:** Adding auth introduces vulnerabilities worse than having no auth. Token stored in localStorage, no expiration, refresh tokens not rotated.

**Why it happens:** Copy-pasting JWT tutorials without understanding security implications. "It works" = shipped.

**Consequences:** Account takeover, unauthorized bookings, Cal.com API key abuse.

**Prevention:**
- Use httpOnly cookies for token storage (not localStorage)
- Implement short-lived access tokens (15 min) with refresh token rotation
- Store refresh tokens server-side (hash them like passwords)
- Add rate limiting per authenticated user, not just IP
- Use existing auth libraries (e.g., express-jwt) over custom implementations

**Warning signs:**
- Tokens stored in response body or localStorage
- No token expiration or refresh endpoint
- Same JWT secret for all environments

**Phase mapping:** Authentication phase (Phase 2)

---

### Pitfall 3: Cache Stampede on Availability Queries

**What goes wrong:** All users get empty availability when cache expires simultaneously. Cache misses trigger thousands of Cal.com API calls.

**Why it happens:** All cached availability slots expire at the same time. Multiple concurrent requests see miss, all call Cal.com.

**Consequences:** Cal.com API rate limits, increased latency, potential account suspension.

**Prevention:**
- Implement cache with jitter (randomize TTL by ±10%)
- Use request coalescing — when multiple requests arrive during cache miss, only one calls Cal.com
- Add probabilistic early expiration (refresh cache before expiry with small probability)
- Consider Redis with pub/sub for distributed cache invalidation

**Warning signs:**
- All availability endpoints use same fixed TTL
- No deduplication of concurrent requests
- Cache-aside pattern with no protection against stampede

**Phase mapping:** Caching phase (Phase 3)

---

### Pitfall 4: Circuit Breaker That Never Recovers

**What goes wrong:** Circuit stays open permanently after Cal.com outage. API never recovers, requires manual restart.

**Why it happens:** Circuit breaker configured with no half-open state, or reset timeout too long, or failure threshold too sensitive.

**Consequences:** Extended service outage even after Cal.com recovers.

**Prevention:**
- Use established circuit breaker library (e.g., `opossum`) over custom implementation
- Configure three states: closed (normal), open (fail fast), half-open (test recovery)
- Set appropriate thresholds: 50% failure rate over 10 seconds, open for 30 seconds
- Log circuit state changes for debugging
- Add manual reset endpoint for operations

**Warning signs:**
- Custom circuit breaker with only two states
- No monitoring of circuit state
- Failure threshold < 3 consecutive failures

**Phase mapping:** Resilience phase (Phase 4)

---

## Moderate Pitfalls

Mistakes that cause significant delays or require refactoring.

### Pitfall 5: Retry Logic That Compounds Outages

**What goes wrong:** Retries amplify problems. 1000 users retrying 3x each = 3000 requests to already-failing Cal.com.

**Why it happens:** Aggressive retry without exponential backoff, no jitter, no limit on retry attempts.

**Consequences:** Thundering herd, Cal.com rate limit triggering, longer recovery time.

**Prevention:**
- Implement exponential backoff: wait 1s, 2s, 4s, 8s... (max 30s)
- Add jitter (randomized delay) to prevent synchronized retries
- Limit total retry attempts to 3-5
- Use circuit breaker to stop retries when service is down
- Consider async retry with message queues for non-critical operations

**Warning signs:**
- Fixed retry delay (e.g., always 1 second)
- No retry limit
- Retries fire immediately on failure

**Phase mapping:** Resilience phase (Phase 4)

---

### Pitfall 6: Stale Cache Serving Wrong Availability

**What goes wrong:** Users book unavailable slots because cache served stale Cal.com data.

**Why it happens:** Cache invalidation is an afterthought. TTL too long. No event-driven invalidation.

**Consequences:** Failed bookings, customer complaints, trust damage.

**Prevention:**
- Set appropriate TTL: availability slots should be fresh (1-5 minutes max)
- Implement event-driven invalidation: when booking created/cancelled, invalidate affected slots
- Add cache version keys or tags for selective invalidation
- Always verify slot availability with Cal.com before finalizing booking (double-booking check)

**Warning signs:**
- Availability cache TTL > 10 minutes
- No cache invalidation on booking changes
- No re-verification step before booking confirmation

**Phase mapping:** Caching phase (Phase 3)

---

### Pitfall 7: Auth Breaking Existing Functionality

**What goes wrong:** Adding authentication middleware breaks existing endpoints. Health check returns 401, seed script fails.

**Why it happens:** Applying auth globally without excluding public endpoints or service accounts.

**Prevention:**
- Apply auth middleware selectively to protected routes
- Exclude health, metrics, and webhook endpoints
- Create service-specific authentication for backend-to-backend calls
- Use route groups: `router.use('/api/bookings', authMiddleware)` not `app.use(authMiddleware)`

**Warning signs:**
- Single auth middleware applied to all routes
- No path exclusions defined
- Test script failures after auth added

**Phase mapping:** Authentication phase (Phase 2)

---

### Pitfall 8: Tests That Can't Run in CI

**What goes wrong:** Tests pass locally, fail in CI. Environment differences, missing dependencies, timing issues.

**Why it happens:** Tests depend on local state, environment variables not set in CI, rely on external services.

**Prevention:**
- Use Docker Compose for test environment setup
- Mock external services at network boundary (e.g., msw for HTTP)
- Ensure all environment variables have defaults or are injected in CI config
- Run tests in CI before merge (not just on deployment)
- Add test coverage threshold gate (e.g., 80% minimum)

**Warning signs:**
- Tests require specific local database state
- No CI configuration for running tests
- `npm test` succeeds but CI pipeline fails

**Phase mapping:** Testing phase (Phase 1)

---

## Minor Pitfalls

Mistakes that cause friction but are recoverable.

### Pitfall 9: Caching Without Metrics

**What goes wrong:** Cache added but no way to measure if it's working. Hit rate unknown, TTL optimality unverified.

**Prevention:** Add cache metrics: hit rate, miss rate, latency improvement, eviction count. Expose via `/metrics` endpoint.

---

### Pitfall 10: Resilience Without Observability

**What goes wrong:** Circuit breaker triggers but no one knows. Retries happen but not logged.

**Prevention:** Log circuit state changes, retry attempts, fallback activations. Include in metrics endpoint.

---

### Pitfall 11: Auth Token Debugging Pain

**What goes wrong:** JWT in httpOnly cookie makes debugging difficult. Can't see token in browser dev tools.

**Prevention:** Add logging for auth failures (invalid, expired, missing). Return clear error codes. Consider short-lived debug mode token for development.

---

### Pitfall 12: Over-Engineering Cache Layer

**What goes wrong:** Redis deployed but app is single-instance. Complexity added without benefit.

**Prevention:** Start with in-memory cache (e.g., `node-cache`). Move to Redis only when scaling requires multi-instance cache sharing.

---

## Phase-Specific Warnings

| Phase | Pitfall | Warning Sign | Mitigation |
|-------|---------|--------------|------------|
| **Testing** | False confidence from mocked tests | High unit test %, no integration tests | Test real HTTP responses with supertest |
| **Testing** | CI failures | Tests pass locally | Docker Compose for reproducible env |
| **Auth** | Breaking existing endpoints | Health returns 401 | Selective middleware application |
| **Auth** | Security vulnerabilities | Tokens in localStorage | Use httpOnly cookies |
| **Caching** | Cache stampede | Sudden Cal.com API spikes | Jitter + request coalescing |
| **Caching** | Stale data | Double bookings | Verify before booking + short TTL |
| **Resilience** | Infinite retries | Cal.com rate limits | Exponential backoff + circuit breaker |
| **Resilience** | Permanent circuit open | Service never recovers | Proper state machine + monitoring |

---

## Cross-Cutting Concerns

These pitfalls span multiple phases:

1. **Observability Gap** — New infrastructure (cache, circuit breaker, auth) needs metrics. Add `/metrics` endpoint in early phase, populate as each feature lands.

2. **Integration Testing** — Every feature (auth, cache, resilience) needs integration tests verifying end-to-end behavior. Don't test in isolation only.

3. **Rollback Strategy** — Each feature should be deployable in disabled state. Feature flags or environment variables to disable cache, circuit breaker, or auth if issues emerge.

---

## Sources

- [Testing Express APIs: Unit Tests vs Integration Tests](https://dev.to/young_gao/testing-express-apis-unit-tests-integration-tests-and-when-to-use-each-400) — DEV Community, 2026-03-21
- [Authentication Strategies in Express: Patterns and Pitfalls](https://thelinuxcode.com/authentication-strategies-in-express-practical-patterns-pitfalls-and-production-ready-defaults/) — TheLinuxCode, 2026-02-12
- [Redis Anti-Patterns](https://redis.io/tutorials/redis-anti-patterns-every-developer-should-avoid/) — Redis, 2026-02-26
- [Why Redis Made Our API Slower](https://devxritesh.medium.com/why-redis-made-our-api-slower-and-how-we-fixed-it-8c0dacd210e3) — Ritesh Roushan, 2026-02-19
- [Circuit Breaker in Node.js](https://dev.to/axiom_agent/nodejs-circuit-breaker-pattern-in-production-prevent-cascading-failures-with-opossum-odg) — DEV Community, 2026-03-28
- [Express.js Middleware Patterns: Auth & Authorization](https://www.grizzlypeaksoftware.com/library/expressjs-middleware-patterns-authentication-and-authorization-4klk7fd8) — Grizzly Peak Software, 2026-02-13

