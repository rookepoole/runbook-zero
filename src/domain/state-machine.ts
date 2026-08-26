import type { ApplicationPhase, ScenarioState } from "./types";
import { invariant } from "./validation";

const ALLOWED_TRANSITIONS: Record<ApplicationPhase, ApplicationPhase[]> = {
  BOOT: ["HEALTHY"],
  HEALTHY: ["INCIDENT_OPEN"],
  INCIDENT_OPEN: ["INVESTIGATING"],
  INVESTIGATING: ["MITIGATION_CANDIDATES"],
  MITIGATION_CANDIDATES: ["MITIGATION_STAGED"],
  MITIGATION_STAGED: ["AWAITING_HUMAN_APPROVAL"],
  AWAITING_HUMAN_APPROVAL: ["APPROVED", "INVESTIGATING"],
  APPROVED: ["MITIGATING"],
  MITIGATING: ["RESOLVED"],
  RESOLVED: ["POSTMORTEM_READY"],
  POSTMORTEM_READY: [],
};

export const canTransition = (
  from: ApplicationPhase,
  to: ApplicationPhase,
): boolean => ALLOWED_TRANSITIONS[from].includes(to);

export const transitionPhase = (
  state: ScenarioState,
  to: ApplicationPhase,
): ScenarioState => {
  invariant(
    canTransition(state.phase, to),
    "INVALID_PHASE",
    `Cannot transition from ${state.phase} to ${to}.`,
  );

  return {
    ...state,
    phase: to,
    phaseHistory: [...state.phaseHistory, to],
  };
};
