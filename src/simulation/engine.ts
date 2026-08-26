import { transitionPhase } from "../domain/state-machine";
import type {
  MitigationId,
  ScenarioState,
  ServiceHealth,
  ServiceId,
  ServiceTelemetry,
} from "../domain/types";
import { invariant } from "../domain/validation";

const RECOVERY_TIMESTAMP = "2026-08-25T14:06:00.000Z";

const updateService = (
  services: ScenarioState["services"],
  serviceId: ServiceId,
  values: Partial<ServiceTelemetry>,
): ScenarioState["services"] => ({
  ...services,
  [serviceId]: {
    ...services[serviceId],
    ...values,
    timestamp: RECOVERY_TIMESTAMP,
  },
});

const predictedHealth = (
  step: number,
  finalHealth: ServiceHealth = "healthy",
): ServiceHealth => (step === 5 ? finalHealth : "degraded");

const applyRecoveryFrame = (
  state: ScenarioState,
  mitigationId: MitigationId,
  step: number,
): ScenarioState["services"] => {
  const option = state.mitigationOptions[mitigationId];
  let services = state.services;

  if (step >= 1) {
    services = updateService(services, "inventory-db", {
      saturationPct: 68,
      p50LatencyMs: 70,
      p95LatencyMs: 260,
      errorRatePct: 2.4,
      health: predictedHealth(step),
    });
  }
  if (step >= 2) {
    services = updateService(services, "inventory", {
      p50LatencyMs: 180,
      p95LatencyMs: 760,
      errorRatePct: 2.1,
      saturationPct: 63,
      health: predictedHealth(step),
    });
  }
  if (step >= 3) {
    services = updateService(services, "checkout", {
      errorRatePct: option.predictedErrorRatePct,
      saturationPct: 61,
      health: predictedHealth(step),
    });
    services = updateService(services, "gateway", {
      errorRatePct: 0.5,
      saturationPct: 49,
      health: predictedHealth(step),
    });
  }
  if (step >= 4) {
    services = updateService(services, "checkout", {
      p50LatencyMs: 145,
      p95LatencyMs: option.predictedP95Ms,
      health: predictedHealth(step),
    });
    services = updateService(services, "inventory", {
      p50LatencyMs: 120,
      p95LatencyMs: Math.max(340, option.predictedP95Ms - 30),
      health: predictedHealth(step),
    });
  }
  if (step === 5) {
    services = updateService(services, "gateway", {
      p50LatencyMs: 34,
      p95LatencyMs: 95,
      errorRatePct: 0.3,
      saturationPct: 45,
      health: "healthy",
    });
    services = updateService(services, "checkout", {
      p50LatencyMs: 145,
      p95LatencyMs: option.predictedP95Ms,
      errorRatePct: option.predictedErrorRatePct,
      saturationPct: 55,
      health: "healthy",
    });
    services = updateService(services, "inventory", {
      p50LatencyMs: 82,
      p95LatencyMs: Math.max(280, option.predictedP95Ms - 140),
      errorRatePct: 0.5,
      saturationPct: 54,
      health: "healthy",
    });
    services = updateService(services, "inventory-db", {
      p50LatencyMs: 18,
      p95LatencyMs: 38,
      errorRatePct: 0.2,
      saturationPct: 55,
      health: "healthy",
    });
  }
  return services;
};

export const advanceRecovery = (state: ScenarioState): ScenarioState => {
  invariant(
    state.phase === "MITIGATING",
    "INVALID_PHASE",
    "Recovery can only advance while mitigation is active.",
  );
  invariant(state.recovery, "NO_RECOVERY", "No recovery simulation is active.");
  const nextStep = state.recovery.step + 1;
  invariant(
    nextStep <= state.recovery.totalSteps,
    "NO_RECOVERY",
    "Recovery simulation is already complete.",
  );
  const services = applyRecoveryFrame(
    state,
    state.recovery.mitigationId,
    nextStep,
  );
  const event = {
    id: `EVT-${String(state.timeline.length + 1).padStart(3, "0")}`,
    timestamp: new Date(
      Date.parse(RECOVERY_TIMESTAMP) + nextStep * 1_000,
    ).toISOString(),
    actor: "system" as const,
    type: "recovery" as const,
    title: `Recovery step ${nextStep} of 5`,
    detail: `Deterministic telemetry frame ${nextStep} applied.`,
  };
  const next: ScenarioState = {
    ...state,
    services,
    recovery: { ...state.recovery, step: nextStep },
    timeline: [...state.timeline, event],
  };

  if (nextStep !== 5) return next;
  const resolved = transitionPhase(next, "RESOLVED");
  return {
    ...resolved,
    incident: { ...resolved.incident, status: "resolved" },
  };
};
