import { rankMitigations, verifyRecovery } from "./queries";
import { transitionPhase } from "./state-machine";
import type {
  MitigationId,
  MitigationKind,
  ScenarioState,
  ServiceTelemetry,
  TimelineEvent,
} from "./types";
import { invariant } from "./validation";

const createEvent = (
  state: ScenarioState,
  event: Omit<TimelineEvent, "id" | "timestamp">,
): TimelineEvent => ({
  ...event,
  id: `EVT-${String(state.timeline.length + 1).padStart(3, "0")}`,
  timestamp: new Date(
    Date.parse(state.eventBaseTimestamp) + state.timeline.length * 1_000,
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
  const execution = state.stagedMitigation.option.execution ?? {
    mode: "simulation" as const,
  };
  if (execution.mode !== "simulation") {
    const event = createEvent(state, {
      actor: "agent",
      type: "apply",
      title: `${mitigationId} released for site execution`,
      detail:
        execution.mode === "external-webmcp"
          ? `Approval-bound WebMCP action ${execution.toolName} may now be invoked on ${execution.targetOrigin}.`
          : `Approval-bound operator handoff may now be carried out on ${execution.targetOrigin}.`,
    });
    return {
      ...transitioned,
      incident: { ...state.incident, status: "mitigating" },
      stagedMitigation: {
        ...state.stagedMitigation,
        status: "released",
        appliedAt: event.timestamp,
      },
      externalExecution: {
        receiptId: `R0-${state.incident.id}-${mitigationId}-${state.seed}`,
        incidentId: state.incident.id,
        scenarioSeed: state.seed,
        mitigationId,
        targetOrigin: execution.targetOrigin,
        mode: execution.mode,
        toolName:
          execution.mode === "external-webmcp" ? execution.toolName : undefined,
        input:
          execution.mode === "external-webmcp"
            ? structuredClone(execution.input)
            : undefined,
        instructions:
          execution.mode === "operator-handoff"
            ? [...execution.instructions]
            : undefined,
        status: "released",
        releasedAt: event.timestamp,
      },
      recovery: null,
      timeline: [...state.timeline, event],
    };
  }

  const effect = state.mitigationEffects[mitigationId];
  invariant(
    effect,
    "UNKNOWN_MITIGATION",
    `Unknown mitigation effect ${mitigationId}.`,
  );
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
    systemConfig: { ...effect.resultingConfig },
    recovery: {
      mitigationId,
      step: 0,
      totalSteps: effect.recoveryFrames.length,
    },
    externalExecution: null,
    timeline: [...state.timeline, event],
  };
};

export const recordExternalExecution = (
  state: ScenarioState,
  observation: {
    origin: string;
    toolName?: string;
    outcome: "succeeded" | "failed";
    summary: string;
    observedAt: string;
    serviceUpdates?: Record<
      string,
      Partial<Omit<ServiceTelemetry, "serviceId" | "timestamp">>
    >;
  },
): ScenarioState => {
  invariant(
    state.phase === "MITIGATING",
    "INVALID_PHASE",
    "External execution can only be recorded after approval is released.",
  );
  const receipt = state.externalExecution;
  invariant(
    receipt?.status === "released",
    "INVALID_PHASE",
    "No released external execution is waiting for evidence.",
  );
  invariant(
    observation.origin === receipt.targetOrigin,
    "INCIDENT_BINDING_MISMATCH",
    "Execution evidence came from a different origin.",
  );
  if (receipt.mode === "external-webmcp") {
    invariant(
      observation.toolName === receipt.toolName,
      "MITIGATION_ID_MISMATCH",
      "Execution evidence must name the exact approved WebMCP tool.",
    );
  }
  invariant(
    !Number.isNaN(Date.parse(observation.observedAt)),
    "INVALID_PHASE",
    "Execution evidence must include an ISO timestamp.",
  );
  invariant(
    observation.summary.trim().length > 0,
    "INVALID_PHASE",
    "Execution evidence must include a summary.",
  );

  let services = state.services;
  for (const [serviceId, update] of Object.entries(
    observation.serviceUpdates ?? {},
  )) {
    invariant(
      services[serviceId],
      "INVALID_PHASE",
      `Execution evidence references unknown service ${serviceId}.`,
    );
    for (const [field, value] of Object.entries(update)) {
      invariant(
        [
          "health",
          "p50LatencyMs",
          "p95LatencyMs",
          "errorRatePct",
          "requestsPerSecond",
          "saturationPct",
        ].includes(field),
        "INVALID_PHASE",
        `Execution evidence contains unsupported field ${field}.`,
      );
      if (field === "health") {
        invariant(
          value === "healthy" || value === "degraded" || value === "critical",
          "INVALID_PHASE",
          "Execution evidence contains an invalid health value.",
        );
      } else {
        invariant(
          typeof value === "number" && Number.isFinite(value) && value >= 0,
          "INVALID_PHASE",
          `Execution evidence contains an invalid ${field} value.`,
        );
      }
    }
    services = {
      ...services,
      [serviceId]: {
        ...services[serviceId],
        ...update,
        serviceId,
        timestamp: observation.observedAt,
      },
    };
  }

  const resultState: ScenarioState = appendEvent(
    {
      ...state,
      services,
      externalExecution: {
        ...receipt,
        status: observation.outcome,
        observedAt: observation.observedAt,
        resultSummary: observation.summary.trim(),
      },
    },
    {
      actor: "agent",
      type: "recovery",
      title:
        observation.outcome === "succeeded"
          ? "External execution evidence recorded"
          : "External execution failed",
      detail: observation.summary.trim(),
    },
  );

  if (observation.outcome === "failed") return resultState;
  const verification = verifyRecovery(resultState);
  if (!verification.recovered) return resultState;
  const resolved = transitionPhase(resultState, "RESOLVED");
  return {
    ...resolved,
    incident: { ...resolved.incident, status: "resolved" },
  };
};
