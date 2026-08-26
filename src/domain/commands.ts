import { rankMitigations } from "./queries";
import { transitionPhase } from "./state-machine";
import type {
  MitigationId,
  MitigationKind,
  ScenarioState,
  TimelineEvent,
} from "./types";
import { invariant } from "./validation";

const EVENT_BASE_MS = Date.parse("2026-08-25T14:05:00.000Z");

const createEvent = (
  state: ScenarioState,
  event: Omit<TimelineEvent, "id" | "timestamp">,
): TimelineEvent => ({
  ...event,
  id: `EVT-${String(state.timeline.length + 1).padStart(3, "0")}`,
  timestamp: new Date(
    EVENT_BASE_MS + state.timeline.length * 1_000,
  ).toISOString(),
});

const appendEvent = (
  state: ScenarioState,
  event: Omit<TimelineEvent, "id" | "timestamp">,
): ScenarioState => ({
  ...state,
  timeline: [...state.timeline, createEvent(state, event)],
});

export const beginInvestigation = (state: ScenarioState): ScenarioState => {
  const transitioned = transitionPhase(state, "INVESTIGATING");
  return appendEvent(
    {
      ...transitioned,
      incident: { ...state.incident, status: "investigating" },
    },
    {
      actor: "agent",
      type: "inspection",
      title: "Investigation started",
      detail: "The agent began gathering read-only incident evidence.",
    },
  );
};

export const setWorkingHypothesis = (
  state: ScenarioState,
  hypothesis: string,
  confidence: "low" | "medium" | "high" = "medium",
  evidenceIds: string[] = [],
): ScenarioState => {
  invariant(
    state.phase === "INVESTIGATING",
    "INVALID_PHASE",
    "A working hypothesis can only be set while investigating.",
  );
  const trimmed = hypothesis.trim();
  invariant(
    trimmed.length > 0,
    "INVALID_PHASE",
    "A working hypothesis cannot be empty.",
  );
  return appendEvent(
    {
      ...state,
      incident: {
        ...state.incident,
        workingHypothesis: trimmed,
        hypothesisConfidence: confidence,
        hypothesisEvidenceIds: [...evidenceIds],
      },
    },
    {
      actor: "agent",
      type: "hypothesis",
      title: "Working hypothesis recorded",
      detail: trimmed,
    },
  );
};

export const addIncidentNote = (
  state: ScenarioState,
  note: string,
  actor: "human" | "agent" = "agent",
): ScenarioState => {
  invariant(
    state.phase !== "BOOT" && state.phase !== "HEALTHY",
    "INVALID_PHASE",
    "Incident notes require an active or resolved incident.",
  );
  const trimmed = note.trim();
  invariant(trimmed.length > 0, "INVALID_PHASE", "A note cannot be empty.");
  return appendEvent(state, {
    actor,
    type: "note",
    title: "Incident note added",
    detail: trimmed,
  });
};

export const compareMitigations = (
  state: ScenarioState,
  options: {
    excludeKinds?: MitigationKind[];
    optimizeFor?: "lowest-risk" | "fastest-recovery" | "lowest-latency";
  } = {},
): ScenarioState => {
  invariant(
    state.phase === "INVESTIGATING",
    "INVALID_PHASE",
    "Mitigations can only be compared after investigation begins.",
  );
  const excludeKinds = [...(options.excludeKinds ?? [])];
  const optimizeFor = options.optimizeFor ?? "lowest-risk";
  const ranked = rankMitigations(state, excludeKinds, optimizeFor);
  const transitioned = transitionPhase(state, "MITIGATION_CANDIDATES");
  const next = {
    ...transitioned,
    mitigationComparison: {
      revision: (state.mitigationComparison?.revision ?? 0) + 1,
      excludeKinds,
      optimizeFor,
      candidateIds: ranked.map((option) => option.id),
    },
  };
  return appendEvent(next, {
    actor: "agent",
    type: "simulation",
    title: "Mitigations compared",
    detail: `Ranked candidates: ${ranked.map((option) => option.id).join(", ")}.`,
  });
};

export const stageMitigation = (
  state: ScenarioState,
  mitigationId: MitigationId,
): ScenarioState => {
  invariant(
    state.phase === "MITIGATION_CANDIDATES",
    "INVALID_PHASE",
    "A mitigation can only be staged from the candidate phase.",
  );
  const option = state.mitigationOptions[mitigationId];
  invariant(
    option,
    "UNKNOWN_MITIGATION",
    `Unknown mitigation ${mitigationId}.`,
  );
  invariant(
    state.mitigationComparison?.candidateIds.includes(mitigationId),
    "STALE_MITIGATION",
    `${mitigationId} is not in the current mitigation comparison.`,
  );

  const staged = transitionPhase(state, "MITIGATION_STAGED");
  const awaitingApproval = transitionPhase(staged, "AWAITING_HUMAN_APPROVAL");
  const next: ScenarioState = {
    ...awaitingApproval,
    incident: {
      ...state.incident,
      status: "awaiting-human-approval",
      stagedMitigationId: mitigationId,
    },
    stagedMitigation: {
      id: mitigationId,
      option: { ...option, assumptions: [...option.assumptions] },
      status: "staged",
      incidentId: state.incident.id,
      scenarioSeed: state.seed,
      stagedAt: createEvent(state, {
        actor: "agent",
        type: "stage",
        title: "placeholder",
        detail: "placeholder",
      }).timestamp,
    },
  };
  return appendEvent(next, {
    actor: "agent",
    type: "stage",
    title: `${mitigationId} staged`,
    detail: "No production configuration or telemetry was changed.",
  });
};

export const approveStagedMitigationAsHuman = (
  state: ScenarioState,
  mitigationId: MitigationId,
): ScenarioState => {
  invariant(
    state.phase === "AWAITING_HUMAN_APPROVAL",
    "INVALID_PHASE",
    "Approval is only accepted at the visible human approval boundary.",
  );
  invariant(
    state.stagedMitigation,
    "NO_STAGED_MITIGATION",
    "There is no staged mitigation to approve.",
  );
  invariant(
    state.stagedMitigation.id === mitigationId,
    "MITIGATION_ID_MISMATCH",
    "Human approval must match the exact staged mitigation ID.",
  );
  invariant(
    state.stagedMitigation.incidentId === state.incident.id &&
      state.stagedMitigation.scenarioSeed === state.seed,
    "INCIDENT_BINDING_MISMATCH",
    "The staged mitigation is not bound to this incident instance.",
  );

  const transitioned = transitionPhase(state, "APPROVED");
  const event = createEvent(state, {
    actor: "human",
    type: "approval",
    title: `${mitigationId} approved by human`,
    detail: "Approval is bound to the exact staged mitigation and incident.",
  });
  return {
    ...transitioned,
    stagedMitigation: {
      ...state.stagedMitigation,
      status: "approved",
      approvedAt: event.timestamp,
    },
    timeline: [...state.timeline, event],
  };
};

export const discardStagedMitigation = (
  state: ScenarioState,
  actor: "human" | "agent" = "agent",
): ScenarioState => {
  invariant(
    state.phase === "AWAITING_HUMAN_APPROVAL",
    "INVALID_PHASE",
    "Only an awaiting staged mitigation can be discarded.",
  );
  invariant(
    state.stagedMitigation,
    "NO_STAGED_MITIGATION",
    "There is no staged mitigation to discard.",
  );
  const mitigationId = state.stagedMitigation.id;
  const transitioned = transitionPhase(state, "INVESTIGATING");
  return appendEvent(
    {
      ...transitioned,
      incident: {
        ...state.incident,
        status: "investigating",
        stagedMitigationId: undefined,
      },
      mitigationComparison: null,
      stagedMitigation: null,
    },
    {
      actor,
      type: "note",
      title: `${mitigationId} discarded`,
      detail: "Any approval binding was invalidated.",
    },
  );
};

export const applyApprovedMitigation = (
  state: ScenarioState,
  mitigationId: MitigationId,
): ScenarioState => {
  invariant(
    state.phase === "APPROVED",
    "NOT_APPROVED",
    "A mitigation cannot be applied before human approval.",
  );
  invariant(
    state.stagedMitigation,
    "NO_STAGED_MITIGATION",
    "There is no staged mitigation to apply.",
  );
  invariant(
    state.stagedMitigation.id === mitigationId,
    "MITIGATION_ID_MISMATCH",
    "The applied mitigation must match the exact approved mitigation ID.",
  );
  invariant(
    state.stagedMitigation.status === "approved",
    "NOT_APPROVED",
    "The staged mitigation does not carry human approval.",
  );
  invariant(
    state.stagedMitigation.incidentId === state.incident.id &&
      state.stagedMitigation.scenarioSeed === state.seed,
    "INCIDENT_BINDING_MISMATCH",
    "Approval belongs to a different incident instance.",
  );

  const transitioned = transitionPhase(state, "MITIGATING");
  const event = createEvent(state, {
    actor: "agent",
    type: "apply",
    title: `${mitigationId} applied`,
    detail: "Recovery simulation started from the approved staged effect.",
  });
  return {
    ...transitioned,
    incident: { ...state.incident, status: "mitigating" },
    stagedMitigation: {
      ...state.stagedMitigation,
      status: "applied",
      appliedAt: event.timestamp,
    },
    systemConfig: { ...state.mitigationEffects[mitigationId] },
    recovery: { mitigationId, step: 0, totalSteps: 5 },
    timeline: [...state.timeline, event],
  };
};
