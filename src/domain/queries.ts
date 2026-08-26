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
import { invariant } from "./validation";

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

export const traceRequestPath = (
  state: ScenarioState,
  flow: UserFlow,
): RequestTrace => {
  const path = state.flows[flow];
  invariant(path, "INVALID_PHASE", `Unknown request flow ${flow}.`);
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
    serviceId === state.configTargetServiceId ? { ...state.systemConfig } : {},
  evidence: state.evidence.filter((item) =>
    item.serviceIds.includes(serviceId),
  ),
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
  const checks = state.recoveryThresholds.map((threshold) => {
    const value = state.services[threshold.serviceId][threshold.metric];
    return {
      metric: `${threshold.serviceId}.${threshold.metric}`,
      value,
      threshold: threshold.threshold,
      pass:
        threshold.operator === "lte"
          ? value <= threshold.threshold
          : value >= threshold.threshold,
    };
  });
  return { recovered: checks.every((check) => check.pass), checks };
};
