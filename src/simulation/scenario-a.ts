import type {
  MitigationEffect,
  MitigationId,
  MitigationOption,
  ScenarioState,
  ServiceId,
  ServiceTelemetry,
} from "../domain/types";

const TIMESTAMP = "2026-08-25T14:05:00.000Z";

const telemetry = (
  serviceId: ServiceId,
  p50LatencyMs: number,
  p95LatencyMs: number,
  errorRatePct: number,
  requestsPerSecond: number,
  saturationPct: number,
  health: ServiceTelemetry["health"] = "healthy",
): ServiceTelemetry => ({
  serviceId,
  health,
  p50LatencyMs,
  p95LatencyMs,
  errorRatePct,
  requestsPerSecond,
  saturationPct,
  timestamp: TIMESTAMP,
});

const createBaselineServices = (): Record<ServiceId, ServiceTelemetry> => ({
  edge: telemetry("edge", 18, 42, 0.1, 1520, 41),
  gateway: telemetry("gateway", 24, 67, 0.2, 1490, 44),
  auth: telemetry("auth", 32, 81, 0.1, 340, 37),
  catalog: telemetry("catalog", 45, 120, 0.2, 720, 51),
  pricing: telemetry("pricing", 39, 102, 0.1, 680, 46),
  checkout: telemetry("checkout", 105, 310, 0.4, 260, 48),
  payments: telemetry("payments", 80, 205, 0.2, 245, 43),
  inventory: telemetry("inventory", 74, 190, 0.3, 410, 49),
  "redis-cache": telemetry("redis-cache", 3, 9, 0, 900, 32),
  "inventory-db": telemetry("inventory-db", 12, 35, 0.1, 520, 45),
  "event-queue": telemetry("event-queue", 5, 14, 0, 190, 29),
});

const createIncidentServices = (): Record<ServiceId, ServiceTelemetry> => ({
  ...createBaselineServices(),
  gateway: telemetry("gateway", 420, 4200, 13.8, 1490, 72, "degraded"),
  checkout: telemetry("checkout", 980, 4700, 17, 260, 88, "critical"),
  inventory: telemetry("inventory", 870, 4380, 16.4, 410, 91, "critical"),
  "inventory-db": telemetry(
    "inventory-db",
    610,
    3910,
    15.9,
    520,
    97,
    "critical",
  ),
});

const createMitigationOptions = (): Record<MitigationId, MitigationOption> => ({
  "M-ROLLBACK-27": {
    id: "M-ROLLBACK-27",
    kind: "rollback",
    title: "Rollback inventory-v2.7.0",
    targetService: "inventory",
    description: "Return inventory to the last known-good release.",
    predictedP95Ms: 390,
    predictedErrorRatePct: 0.7,
    estimatedRecoverySeconds: 75,
    risk: "medium",
    reversible: true,
    assumptions: ["The prior image remains available."],
  },
  "M-POOL-RESTORE": {
    id: "M-POOL-RESTORE",
    kind: "config-restore",
    title: "Restore inventory database pool",
    targetService: "inventory",
    description: "Restore dbPoolSize from 12 to its known-good value of 80.",
    predictedP95Ms: 420,
    predictedErrorRatePct: 0.8,
    estimatedRecoverySeconds: 45,
    risk: "low",
    reversible: true,
    assumptions: ["Database capacity supports the known-good pool size."],
  },
  "M-CACHE-DEGRADE": {
    id: "M-CACHE-DEGRADE",
    kind: "cache-degrade-mode",
    title: "Enable stale inventory cache",
    targetService: "inventory",
    description:
      "Serve inventory reads from a bounded stale cache for 30 seconds.",
    predictedP95Ms: 650,
    predictedErrorRatePct: 1.5,
    estimatedRecoverySeconds: 25,
    risk: "low",
    reversible: true,
    assumptions: ["Thirty seconds of inventory staleness is acceptable."],
  },
});

const createMitigationEffects = (): Record<MitigationId, MitigationEffect> => ({
  "M-ROLLBACK-27": {
    inventoryRelease: "inventory-v2.6.4",
    inventoryDbPoolSize: 80,
    staleInventoryCacheSeconds: 0,
  },
  "M-POOL-RESTORE": {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 80,
    staleInventoryCacheSeconds: 0,
  },
  "M-CACHE-DEGRADE": {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 12,
    staleInventoryCacheSeconds: 30,
  },
});

export const createScenarioA = (): ScenarioState => ({
  id: "INC-042",
  seed: 42,
  phase: "INCIDENT_OPEN",
  phaseHistory: ["BOOT", "HEALTHY", "INCIDENT_OPEN"],
  incident: {
    id: "INC-042",
    title: "Checkout latency and inventory reservation failures",
    severity: "SEV-2",
    status: "open",
    startedAt: "2026-08-25T14:02:00.000Z",
    affectedServices: ["checkout", "inventory", "inventory-db", "gateway"],
    customerImpact:
      "Checkout requests are slow and intermittently fail during inventory reservation.",
  },
  services: createIncidentServices(),
  baselineServices: createBaselineServices(),
  topology: {
    edge: ["gateway"],
    gateway: ["auth", "catalog", "checkout"],
    auth: [],
    catalog: ["pricing", "inventory"],
    pricing: [],
    checkout: ["payments", "inventory"],
    payments: [],
    inventory: ["redis-cache", "inventory-db", "event-queue"],
    "redis-cache": [],
    "inventory-db": [],
    "event-queue": [],
  },
  changes: [
    {
      id: "CHG-271",
      timestamp: "2026-08-25T13:51:00.000Z",
      serviceId: "inventory",
      category: "deploy",
      summary: "Deployed inventory-v2.7.0 with reduced database pool",
      version: "inventory-v2.7.0",
      author: "release-bot",
      risk: "high",
      diff: { dbPoolSize: { from: 80, to: 12 } },
    },
  ],
  mitigationOptions: createMitigationOptions(),
  mitigationEffects: createMitigationEffects(),
  mitigationComparison: null,
  stagedMitigation: null,
  systemConfig: {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 12,
    staleInventoryCacheSeconds: 0,
  },
  baselineConfig: {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 80,
    staleInventoryCacheSeconds: 0,
  },
  timeline: [
    {
      id: "EVT-001",
      timestamp: "2026-08-25T14:02:00.000Z",
      actor: "system",
      type: "incident",
      title: "INC-042 opened",
      detail: "Checkout SLO breached after inventory-v2.7.0 deployment.",
    },
  ],
  recovery: null,
});
