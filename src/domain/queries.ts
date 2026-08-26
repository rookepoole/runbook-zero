import type {
  MitigationKind,
  MitigationOption,
  RecoveryVerification,
  RequestTrace,
  ScenarioState,
  ServiceId,
  SystemSnapshot,
  UserFlow,
} from "./types";

export const getSystemSnapshot = (state: ScenarioState): SystemSnapshot => ({
  incident: {
    id: state.incident.id,
    status: state.incident.status,
    severity: state.incident.severity,
    customerImpact: state.incident.customerImpact,
  },
  unhealthyServices: Object.values(state.services)
    .filter(
      (
        service,
      ): service is typeof service & { health: "degraded" | "critical" } =>
        service.health !== "healthy",
    )
    .sort((a, b) => {
      const severity = { critical: 0, degraded: 1 } as const;
      return severity[a.health] - severity[b.health];
    })
    .map(({ serviceId, health, p95LatencyMs, errorRatePct }) => ({
      serviceId,
      health,
      p95LatencyMs,
      errorRatePct,
    })),
});

const FLOW_PATHS: Record<
  UserFlow,
  Pick<RequestTrace, "primaryPath" | "branches">
> = {
  checkout: {
    primaryPath: ["edge", "gateway", "checkout", "inventory", "inventory-db"],
    branches: [
      ["checkout", "payments"],
      ["inventory", "redis-cache"],
      ["inventory", "event-queue"],
    ],
  },
  "catalog-browse": {
    primaryPath: ["edge", "gateway", "catalog", "inventory", "inventory-db"],
    branches: [
      ["catalog", "pricing"],
      ["inventory", "redis-cache"],
    ],
  },
  login: {
    primaryPath: ["edge", "gateway", "auth"],
    branches: [],
  },
};

export const traceRequestPath = (
  state: ScenarioState,
  flow: UserFlow,
): RequestTrace => {
  const path = FLOW_PATHS[flow];
  const allServices = new Set<ServiceId>([
    ...path.primaryPath,
    ...path.branches.flat(),
  ]);
  return {
    flow,
    primaryPath: [...path.primaryPath],
    branches: path.branches.map((branch) => [...branch]),
    unhealthyServices: [...allServices].filter(
      (serviceId) => state.services[serviceId].health !== "healthy",
    ),
  };
};

export const getRecentChanges = (state: ScenarioState) =>
  [...state.changes].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const inspectService = (state: ScenarioState, serviceId: ServiceId) => ({
  telemetry: { ...state.services[serviceId] },
  dependencies: [...state.topology[serviceId]],
  config:
    serviceId === "inventory"
      ? { ...state.systemConfig }
      : ({} satisfies Record<string, never>),
});

export const querySignals = (
  state: ScenarioState,
  serviceId: ServiceId,
  window: "15m" | "30m" | "60m" = "15m",
) => {
  const current = state.services[serviceId];
  const baseline = state.baselineServices[serviceId];
  return {
    serviceId,
    window,
    current: { ...current },
    baseline: { ...baseline },
    anomalies: {
      p95LatencyMs: current.p95LatencyMs - baseline.p95LatencyMs,
      errorRatePct: current.errorRatePct - baseline.errorRatePct,
      saturationPct: current.saturationPct - baseline.saturationPct,
    },
  };
};

const comparisonValue = (
  option: MitigationOption,
  optimizeFor: "lowest-risk" | "fastest-recovery" | "lowest-latency",
): number => {
  if (optimizeFor === "fastest-recovery")
    return option.estimatedRecoverySeconds;
  if (optimizeFor === "lowest-latency") return option.predictedP95Ms;
  return option.risk === "low" ? 0 : option.risk === "medium" ? 1 : 2;
};

export const rankMitigations = (
  state: ScenarioState,
  excludeKinds: MitigationKind[] = [],
  optimizeFor:
    "lowest-risk" | "fastest-recovery" | "lowest-latency" = "lowest-risk",
): MitigationOption[] =>
  Object.values(state.mitigationOptions)
    .filter((option) => !excludeKinds.includes(option.kind))
    .sort(
      (a, b) =>
        comparisonValue(a, optimizeFor) - comparisonValue(b, optimizeFor) ||
        a.predictedP95Ms - b.predictedP95Ms ||
        a.id.localeCompare(b.id),
    );

export const verifyRecovery = (state: ScenarioState): RecoveryVerification => {
  const checkout = state.services.checkout;
  const inventoryDb = state.services["inventory-db"];
  const checks = [
    {
      metric: "checkout.p95LatencyMs",
      value: checkout.p95LatencyMs,
      threshold: 500,
      pass: checkout.p95LatencyMs <= 500,
    },
    {
      metric: "checkout.errorRatePct",
      value: checkout.errorRatePct,
      threshold: 1,
      pass: checkout.errorRatePct <= 1,
    },
    {
      metric: "inventory-db.saturationPct",
      value: inventoryDb.saturationPct,
      threshold: 70,
      pass: inventoryDb.saturationPct <= 70,
    },
  ];
  return { recovered: checks.every((check) => check.pass), checks };
};
