import type { ScenarioState, ServiceTelemetry, SystemSnapshot } from "./types";

const isUnhealthy = (
  service: ServiceTelemetry,
): service is ServiceTelemetry & { health: "degraded" | "critical" } =>
  service.health !== "healthy";

export const getSystemSnapshot = (scenario: ScenarioState): SystemSnapshot => ({
  incident: {
    id: scenario.incident.id,
    status: scenario.incident.status,
    severity: scenario.incident.severity,
    customerImpact: scenario.incident.customerImpact,
  },
  unhealthyServices: Object.values(scenario.services)
    .filter(isUnhealthy)
    .map((service) => ({
      serviceId: service.serviceId,
      health: service.health,
      p95LatencyMs: service.p95LatencyMs,
      errorRatePct: service.errorRatePct,
    }))
    .sort((left, right) => right.p95LatencyMs - left.p95LatencyMs),
});
