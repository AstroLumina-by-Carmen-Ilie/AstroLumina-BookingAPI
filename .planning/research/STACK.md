# Technology Stack: Testing, Caching & Resilience

**Research Date:** 2026-03-30
**Context:** Adding testing, caching, and resilience to existing Express/TypeScript booking API

---

## Executive Summary

For an Express 5.x + TypeScript API in 2026, the recommended stack is:

- **Testing:** Vitest + supertest (Vitest wins on speed, ESM support, and Vite integration)
- **Caching:** node-cache-manager with ioredis (for production) or in-memory (for development)
- **Resilience:** opossum (circuit breaker) + axios-retry (retry logic)

---

## 1. Testing Stack

### Recommended: Vitest + supertest

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **vitest** | 4.1.2 | Test runner | 43M+ weekly downloads. Native ESM, Vite-native speed (10-20x faster than Jest), nearly identical Jest API |
| **supertest** | 7.2.2 | HTTP API testing | 11M weekly downloads. De facto standard for Express HTTP testing. SuperAgent-based |
| **@types/supertest** | 7.2.0 | TypeScript definitions | Required for full type inference |

### Alternative Considered: Jest

| Library | Version | Why NOT |
|---------|---------|---------|
| **jest** | ~29.x | Slower (no Vite-native), heavier bundle, older ESM support. Fine for existing codebases, but new projects should use Vitest |

### Installation

```bash
# Core testing dependencies
npm install -D vitest supertest @types/supertest

# Optional but recommended additions
npm install -D @vitest/coverage-v8 jsdom
```

### Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### API Testing Pattern with supertest

```typescript
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from './src/server.js';

describe('Health API', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });
});
```

**Confidence:** HIGH — Multiple 2026 sources confirm Vitest as the standard for new TypeScript projects.

---

## 2. Caching Stack

### Recommended: node-cache-manager

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **cache-manager** | 7.2.8 | Multi-store caching abstraction | 3.2M weekly downloads. Supports memory, Redis, and custom stores |
| **ioredis** | ^5.4.0 | Redis client | Most popular Node.js Redis client, Promise-based, connection pooling |
| **cache-manager-ioredis-yet** | 1.1.2 | Redis store for cache-manager | Maintained Redis store adapter |

### In-Memory Alternative: cache-manager (default)

For development or single-instance deployments, the default in-memory store works well:

```typescript
import { caching, MemoryConfig } from 'cache-manager';

const cacheConfig: MemoryConfig = {
  ttl: 60 * 5, // 5 minutes
  max: 1000,   // max items in cache
};

const cache = await caching('memory', cacheConfig);
```

### Redis for Production

```typescript
import { caching, RedisCacheManager } from 'cache-manager';
import Redis from 'ioredis';

const redisStore = await require('cache-manager-ioredis-yet').default;

const cache = await caching(redisStore, {
  ttl: 300, // 5 minutes TTL
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});
```

### Express Caching Middleware Pattern

```typescript
import express from 'express';
import { cache } from './services/cache.js';

export const cacheMiddleware = (ttlSeconds: number = 300) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET') {
      return next(); // Only cache GET requests
    }

    const key = `cache:${req.originalUrl}`;
    const cached = await cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      cache.set(key, body, ttlSeconds).catch(console.error);
      return originalJson(body);
    };

    next();
  };
};
```

### Cache Invalidation Strategy

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| **TTL-based** | Availability slots, event types | 5-15 minute TTL |
| **Event-based** | Booking data | Invalidate on create/update/cancel |
| **Manual** | Admin operations | API endpoint to clear cache |

**Confidence:** HIGH — node-cache-manager is the established standard with excellent Redis integration.

---

## 3. Resilience Patterns

### Circuit Breaker: Opossum

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **opossum** | 9.0.0 | Circuit breaker | 1.6K GitHub stars. Red Hat maintained. Fail-fast, fallback support, events |
| **@types/opossum** | 8.1.9 | TypeScript definitions | Required for type safety |

### Retry Logic: axios-retry

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **axios-retry** | 4.5.0 | Automatic retry for Axios | 6.4M weekly downloads. Intercepts failed requests, exponential backoff |

### Usage Pattern

```typescript
import axios from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';

// Configure axios retry
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000, // exponential backoff
  retryCondition: (error) => {
    return error.code === 'ECONNRESET' || 
           error.response?.status === 429 ||
           error.response?.status >= 500;
  },
});

// Circuit breaker for Cal.com calls
const breaker = new CircuitBreaker(calcomCall, {
  timeout: 5000, // 5 second timeout
  errorThresholdPercentage: 50, // open at 50% failure rate
  resetTimeout: 30000, // 30 seconds before half-open
});

breaker.fallback(() => {
  console.warn('Circuit breaker fallback triggered');
  return { fallback: true, data: [] };
});

breaker.on('open', () => console.warn('Circuit breaker OPEN'));
breaker.on('close', () => console.log('Circuit breaker CLOSED'));
```

### Recommended Configuration for Cal.com API

| Pattern | Configuration | Rationale |
|---------|---------------|-----------|
| **Retry** | 3 attempts, exponential backoff (1s, 2s, 3s) | Handle transient network issues |
| **Circuit Breaker** | 50% error threshold, 30s reset, 5s timeout | Fast-fail when Cal.com is down |
| **Bulkhead** | Max 10 concurrent requests | Prevent overwhelming Cal.com |

**Confidence:** HIGH (opossum) / MEDIUM (axios-retry — last update 2024, but widely adopted)

---

## 4. What NOT to Use

| Library | Why Avoid | Alternative |
|---------|-----------|-------------|
| **Jest** (new projects) | Heavier, slower than Vitest | Vitest |
| **node-cache** (npm) | Abandoned, no TypeScript support | node-cache-manager |
| **acorn** (circuit breaker) | Less maintained than opossum | opossum |
| **p-retry** | Generic retry, not Axios-specific | axios-retry |

---

## 5. Complete Installation

```bash
# Testing
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest

# Caching
npm install cache-manager ioredis cache-manager-ioredis-yet

# Resilience
npm install opossum axios-retry
npm install -D @types/opossum
```

---

## 6. Environment Variables

Add to `.env.example`:

```bash
# Caching (production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Resilience (optional overrides)
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_RESET=30000
```

---

## Sources

- **Vitest:** https://www.npmjs.com/package/vitest (v4.1.2, Mar 2026)
- **supertest:** https://www.npmjs.com/package/supertest (v7.2.2, Jan 2026)
- **@types/supertest:** https://www.npmjs.com/package/@types/supertest (v7.2.0, Feb 2026)
- **cache-manager:** https://www.npmjs.com/package/cache-manager (v7.2.8, Jan 2026)
- **opossum:** https://www.npmjs.com/package/opossum (v9.0.0, Jun 2025)
- **axios-retry:** https://www.npmjs.com/package/axios-retry (v4.5.0, Aug 2024)
- **PkgPulse Vitest vs Jest 2026:** https://www.pkgpulse.com/blog/vitest-vs-jest-2026
- **DevTools Vitest vs Jest 2026:** https://devtoolswatch.com/en/vitest-vs-jest-2026
