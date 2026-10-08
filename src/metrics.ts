import type { NextFunction, Request, Response } from "express";
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from "@prometheus-io/client";

// Dedicated registry (separate from the global one) so /metrics exposes
// exactly our series plus the Node.js default metrics, nothing else.
export const registry = new Registry();

// Liveness of the process itself: CPU, memory, event loop lag, GC, ...
// All series below carry a constant `service="booking-api"` label.
registry.setDefaultLabels({ service: "booking-api" });
collectDefaultMetrics({ register: registry });

// Total HTTP requests, labeled to stay low-cardinality (route template, not URL).
const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests.",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

// Request duration in seconds, usable for latency percentiles in Grafana.
const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Express middleware recording one observation per finished request.
// The /metrics endpoint itself is skipped to avoid self-measurement noise.
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path === "/metrics") {
    next();
    return;
  }
  const endTimer = httpRequestDuration.startTimer();
  res.on("finish", () => {
    // At finish time routing is done, so req.route holds the matched
    // template (e.g. "/api/booking/:id") instead of the raw URL.
    const rawRoute =
      typeof req.route?.path === "string" ? req.route.path : req.path;
    const route = Array.isArray(rawRoute) ? rawRoute.join(",") : rawRoute;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });
  next();
}

// Plain-text exposition handler scraped by Prometheus.
export async function metricsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.set("Content-Type", registry.contentType);
  res.send(await registry.metrics());
}
