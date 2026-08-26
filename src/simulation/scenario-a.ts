import type {
  ScenarioState,
  ServiceId,
  ServiceTelemetry,
} from "../domain/types";

const timestamp = "2026-08-25T14:05:00.000Z";

const telemetry = (
  serviceId: ServiceId,
  values: Omit<ServiceTelemetry, "serviceId" | "timestamp">,
): ServiceTelemetry => ({ serviceId, timestamp, ...values });

export const createScenarioA = (): ScenarioState => ({
  id: "INC-042",
  seed: 42,
  incident: {
    id: "INC-042",
    title: "Checkout latency after inventory connection-pool regression",
    severity: "SEV-2",
    status: "open",
    startedAt: "2026-08-25T13:42:00.000Z",
    affectedServices: ["checkout", "inventory", "inventory-db"],
    customerImpact:
      "Checkout requests are slow and intermittently fail during inventory reservation.",
  },
  services: {
    edge: telemetry("edge", {
      health: "healthy",
      p50LatencyMs: 32,
      p95LatencyMs: 74,
      errorRatePct: 0.1,
      requestsPerSecond: 1280,
      saturationPct: 42,
    }),
    gateway: telemetry("gateway", {
      health: "degraded",
      p50LatencyMs: 210,
      p95LatencyMs: 1910,
      errorRatePct: 5.8,
      requestsPerSecond: 1190,
      saturationPct: 68,
    }),
    auth: telemetry("auth", {
      health: "healthy",
      p50LatencyMs: 68,
      p95LatencyMs: 142,
      errorRatePct: 0.2,
      requestsPerSecond: 310,
      saturationPct: 39,
    }),
    catalog: telemetry("catalog", {
      health: "healthy",
      p50LatencyMs: 82,
      p95LatencyMs: 176,
      errorRatePct: 0.3,
      requestsPerSecond: 450,
      saturationPct: 47,
    }),
    pricing: telemetry("pricing", {
      health: "healthy",
      p50LatencyMs: 51,
      p95LatencyMs: 118,
      errorRatePct: 0.1,
      requestsPerSecond: 390,
      saturationPct: 35,
    }),
    checkout: telemetry("checkout", {
      health: "critical",
      p50LatencyMs: 2280,
      p95LatencyMs: 4700,
      errorRatePct: 17,
      requestsPerSecond: 188,
      saturationPct: 84,
    }),
    payments: telemetry("payments", {
      health: "healthy",
      p50LatencyMs: 96,
      p95LatencyMs: 205,
      errorRatePct: 0.4,
      requestsPerSecond: 176,
      saturationPct: 44,
    }),
    inventory: telemetry("inventory", {
      health: "critical",
      p50LatencyMs: 1680,
      p95LatencyMs: 3910,
      errorRatePct: 14.2,
      requestsPerSecond: 182,
      saturationPct: 91,
    }),
    "redis-cache": telemetry("redis-cache", {
      health: "healthy",
      p50LatencyMs: 8,
      p95LatencyMs: 18,
      errorRatePct: 0,
      requestsPerSecond: 540,
      saturationPct: 36,
    }),
    "inventory-db": telemetry("inventory-db", {
      health: "critical",
      p50LatencyMs: 1510,
      p95LatencyMs: 3420,
      errorRatePct: 11.8,
      requestsPerSecond: 196,
      saturationPct: 97,
    }),
    "event-queue": telemetry("event-queue", {
      health: "healthy",
      p50LatencyMs: 24,
      p95LatencyMs: 61,
      errorRatePct: 0.1,
      requestsPerSecond: 206,
      saturationPct: 41,
    }),
  },
});
