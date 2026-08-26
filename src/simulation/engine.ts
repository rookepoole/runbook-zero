import { transitionPhase } from "../domain/state-machine";
import type {
  ScenarioState,
  ServiceId,
  ServiceTelemetry,
} from "../domain/types";
import { invariant } from "../domain/validation";

const updateService = (
  services: ScenarioState["services"],
  serviceId: ServiceId,
  values: Partial<ServiceTelemetry>,
  timestamp: string,
): ScenarioState["services"] => ({
  ...services,
  [serviceId]: {
    ...services[serviceId],
    ...values,
    serviceId,
    timestamp,
  },
});

export const advanceRecovery = (state: ScenarioState): ScenarioState => {
  invariant(
    state.phase === "MITIGATING",
    "INVALID_PHASE",
    "Recovery can only advance while mitigation is active.",
  );
  invariant(state.recovery, "NO_RECOVERY", "No recovery simulation is active.");
  const effect = state.mitigationEffects[state.recovery.mitigationId];
  invariant(
    effect,
    "UNKNOWN_MITIGATION",
    `Unknown mitigation effect ${state.recovery.mitigationId}.`,
  );
  const nextStep = state.recovery.step + 1;
  invariant(
    nextStep <= effect.recoveryFrames.length,
    "NO_RECOVERY",
    "Recovery simulation is already complete.",
  );
  const frame = effect.recoveryFrames[nextStep - 1];
  const frameTimestamp = new Date(
    Date.parse(state.recoveryTimestamp) + nextStep * 1_000,
  ).toISOString();
  let services = state.services;
  for (const [serviceId, update] of Object.entries(frame.serviceUpdates)) {
    invariant(
      services[serviceId],
      "INVALID_PHASE",
      `Recovery frame references unknown service ${serviceId}.`,
    );
    services = updateService(services, serviceId, update, frameTimestamp);
  }
  const event = {
    id: `EVT-${String(state.timeline.length + 1).padStart(3, "0")}`,
    timestamp: frameTimestamp,
    actor: "system" as const,
    type: "recovery" as const,
    title: `Recovery step ${nextStep} of ${effect.recoveryFrames.length}`,
    detail: `Deterministic telemetry frame ${nextStep} applied for ${state.pack.name}.`,
  };
  const next: ScenarioState = {
    ...state,
    services,
    recovery: {
      ...state.recovery,
      step: nextStep,
      totalSteps: effect.recoveryFrames.length,
    },
    timeline: [...state.timeline, event],
  };

  if (nextStep !== effect.recoveryFrames.length) return next;
  const resolved = transitionPhase(next, "RESOLVED");
  return {
    ...resolved,
    incident: { ...resolved.incident, status: "resolved" },
  };
};
