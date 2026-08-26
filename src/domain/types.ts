export type ServiceId =
  | "edge"
  | "gateway"
  | "auth"
  | "catalog"
  | "pricing"
  | "checkout"
  | "payments"
  | "inventory"
  | "redis-cache"
  | "inventory-db"
  | "event-queue";

export type ServiceHealth = "healthy" | "degraded" | "critical";

export interface ServiceTelemetry {
  serviceId: ServiceId;
  health: ServiceHealth;
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorRatePct: number;
  requestsPerSecond: number;
  saturationPct: number;
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  status:
    | "open"
    | "investigating"
    | "mitigation-staged"
    | "awaiting-human-approval"
    | "mitigating"
    | "resolved";
  startedAt: string;
  affectedServices: ServiceId[];
  customerImpact: string;
}

export interface ScenarioState {
  id: "INC-042";
  seed: 42;
  incident: Incident;
  services: Record<ServiceId, ServiceTelemetry>;
}

export interface SystemSnapshot {
  incident: {
    id: string;
    status: Incident["status"];
    severity: Incident["severity"];
    customerImpact: string;
  };
  unhealthyServices: Array<{
    serviceId: ServiceId;
    health: Exclude<ServiceHealth, "healthy">;
    p95LatencyMs: number;
    errorRatePct: number;
  }>;
}
