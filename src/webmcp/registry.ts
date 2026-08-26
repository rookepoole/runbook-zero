import {
  addIncidentNote,
  applyApprovedMitigation,
  beginInvestigation,
  compareMitigations,
  discardStagedMitigation,
  setWorkingHypothesis,
  stageMitigation,
} from "../domain/commands";
import {
  getRecentChanges,
  getSystemSnapshot,
  inspectService,
  querySignals,
  rankMitigations,
  traceRequestPath,
  verifyRecovery,
} from "../domain/queries";
import type {
  ApplicationPhase,
  MitigationId,
  MitigationKind,
  ScenarioState,
  ServiceId,
  UserFlow,
} from "../domain/types";
import { invariant } from "../domain/validation";
import { useRunbookStore } from "../state/store";

export const TOOL_NAMES = [
  "get_system_snapshot",
  "inspect_service",
  "query_signals",
  "trace_request_path",
  "get_recent_changes",
  "set_working_hypothesis",
  "compare_mitigations",
  "stage_mitigation",
  "discard_staged_mitigation",
  "apply_approved_mitigation",
  "verify_recovery",
  "add_incident_note",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const GET_SYSTEM_SNAPSHOT_TOOL_NAME = "get_system_snapshot";
export const APPLY_APPROVED_MITIGATION_TOOL_NAME = "apply_approved_mitigation";

const BASE_TOOLS: ToolName[] = [
  "get_system_snapshot",
  "inspect_service",
  "query_signals",
  "trace_request_path",
  "get_recent_changes",
];

const INCIDENT_TOOLS: ToolName[] = [
  "set_working_hypothesis",
  "compare_mitigations",
  "stage_mitigation",
  "add_incident_note",
];

export const getActiveToolNames = (phase: ApplicationPhase): ToolName[] => {
  if (phase === "BOOT" || phase === "HEALTHY") return [...BASE_TOOLS];
  if (
    phase === "MITIGATING" ||
    phase === "RESOLVED" ||
    phase === "POSTMORTEM_READY"
  ) {
    return [...BASE_TOOLS, "verify_recovery", "add_incident_note"];
  }

  const names = [...BASE_TOOLS, ...INCIDENT_TOOLS];
  if (phase === "MITIGATION_STAGED" || phase === "AWAITING_HUMAN_APPROVAL") {
    names.push("discard_staged_mitigation");
  }
  if (phase === "APPROVED") {
    return [
      ...BASE_TOOLS,
      "set_working_hypothesis",
      "compare_mitigations",
      "apply_approved_mitigation",
      "verify_recovery",
      "add_incident_note",
    ];
  }
  return names;
};

export const getRegisteredToolNames = (state: ScenarioState): ToolName[] =>
  getActiveToolNames(state.phase).filter(
    (name) =>
      name !== APPLY_APPROVED_MITIGATION_TOOL_NAME ||
      state.stagedMitigation?.status === "approved",
  );

export interface RegisteredToolHandle {
  unregister: () => void;
  registered: Promise<void>;
  names: ToolName[];
}

const requiredString = (
  input: Record<string, unknown>,
  key: string,
): string => {
  const value = input[key];
  invariant(
    typeof value === "string" && value.trim().length > 0,
    "INVALID_PHASE",
    `${key} must be a non-empty string.`,
  );
  return value;
};

const currentScenario = (): ScenarioState =>
  useRunbookStore.getState().scenario;

const commitAgentScenario = (
  scenario: ScenarioState,
  action: string,
  focusedSurface:
    "incident-command" | "telemetry" | "timeline" = "incident-command",
) =>
  useRunbookStore
    .getState()
    .commitAgentScenario(scenario, action, focusedSurface);

const readOnlyAnnotations = {
  readOnlyHint: true,
  untrustedContentHint: false,
};

const toolDefinitions = (): Record<ToolName, WebMCPTool> => {
  const scenario = currentScenario();
  const serviceSchema = {
    type: "string",
    enum: Object.keys(scenario.services),
  };
  const flowSchema = {
    type: "string",
    enum: Object.keys(scenario.flows),
  };
  const mitigationSchema = {
    type: "string",
    enum: Object.keys(scenario.mitigationOptions),
  };
  const approvedMitigationSchema = {
    type: "string",
    enum:
      scenario.stagedMitigation?.status === "approved"
        ? [scenario.stagedMitigation.id]
        : [],
  };

  return {
    get_system_snapshot: {
      name: "get_system_snapshot",
      title: "Get system snapshot",
      description:
        "Inspect the active incident and unhealthy services. Use this first to understand current system health without changing state.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: () => {
        const store = useRunbookStore.getState();
        const result = getSystemSnapshot(store.scenario);
        store.focusSystemOverviewFromAgent();
        return result;
      },
    },
    inspect_service: {
      name: "inspect_service",
      title: "Inspect service",
      description:
        "Inspect current telemetry, dependencies, and active configuration for one service.",
      inputSchema: {
        type: "object",
        properties: { serviceId: serviceSchema },
        required: ["serviceId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (raw) => {
        const serviceId = requiredString(raw, "serviceId") as ServiceId;
        const state = currentScenario();
        invariant(
          state.services[serviceId],
          "INVALID_PHASE",
          `Unknown service ${serviceId}.`,
        );
        const result = inspectService(state, serviceId);
        useRunbookStore
          .getState()
          .recordAgentInspection(
            `Agent inspected ${serviceId}.`,
            "telemetry",
            serviceId,
          );
        return result;
      },
    },
    query_signals: {
      name: "query_signals",
      title: "Query signals",
      description:
        "Compare current and baseline telemetry for a service and identify anomalies.",
      inputSchema: {
        type: "object",
        properties: {
          serviceId: serviceSchema,
          window: { type: "string", enum: ["15m", "30m", "60m"] },
        },
        required: ["serviceId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (raw) => {
        const serviceId = requiredString(raw, "serviceId") as ServiceId;
        invariant(
          currentScenario().services[serviceId],
          "INVALID_PHASE",
          `Unknown service ${serviceId}.`,
        );
        const window = (raw.window ?? "15m") as "15m" | "30m" | "60m";
        const result = querySignals(currentScenario(), serviceId, window);
        useRunbookStore
          .getState()
          .recordAgentInspection(
            `Agent queried ${serviceId} signals.`,
            "telemetry",
            serviceId,
          );
        return result;
      },
    },
    trace_request_path: {
      name: "trace_request_path",
      title: "Trace request path",
      description: "Trace dependencies for a named user flow.",
      inputSchema: {
        type: "object",
        properties: {
          flow: flowSchema,
        },
        required: ["flow"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (raw) => {
        const flow = requiredString(raw, "flow") as UserFlow;
        invariant(
          currentScenario().flows[flow],
          "INVALID_PHASE",
          `Unknown request flow ${flow}.`,
        );
        const result = traceRequestPath(currentScenario(), flow);
        useRunbookStore
          .getState()
          .recordAgentInspection(
            `Agent traced the ${flow} request path.`,
            "topology",
            undefined,
            flow,
          );
        return result;
      },
    },
    get_recent_changes: {
      name: "get_recent_changes",
      title: "Get recent changes",
      description:
        "Inspect deploy and configuration changes near the incident.",
      inputSchema: {
        type: "object",
        properties: {
          serviceId: serviceSchema,
          since: { type: "string", enum: ["15m", "30m", "60m", "6h"] },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (raw) => {
        const serviceId = raw.serviceId as ServiceId | undefined;
        const changes = getRecentChanges(currentScenario()).filter(
          (change) => !serviceId || change.serviceId === serviceId,
        );
        useRunbookStore
          .getState()
          .recordAgentInspection(
            "Agent inspected the change timeline.",
            "timeline",
          );
        return changes;
      },
    },
    set_working_hypothesis: {
      name: "set_working_hypothesis",
      title: "Set working hypothesis",
      description:
        "Record the agent's current diagnosis in the shared workspace.",
      inputSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "confidence"],
        additionalProperties: false,
      },
      execute: (raw) => {
        const summary = requiredString(raw, "summary");
        const confidence = requiredString(raw, "confidence") as
          "low" | "medium" | "high";
        const evidenceIds = (raw.evidenceIds ?? []) as string[];
        let state = currentScenario();
        if (state.phase === "INCIDENT_OPEN") state = beginInvestigation(state);
        const next = setWorkingHypothesis(
          state,
          summary,
          confidence,
          evidenceIds,
        );
        commitAgentScenario(next, "Agent recorded a working hypothesis.");
        return { hypothesis: next.incident.workingHypothesis };
      },
    },
    compare_mitigations: {
      name: "compare_mitigations",
      title: "Compare mitigations",
      description:
        "Simulate candidate mitigations without changing production state.",
      inputSchema: {
        type: "object",
        properties: {
          excludeKinds: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "rollback",
                "config-restore",
                "cache-degrade-mode",
                "traffic-shift",
                "capacity-adjustment",
              ],
            },
          },
          optimizeFor: {
            type: "string",
            enum: ["lowest-risk", "fastest-recovery", "lowest-latency"],
          },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (raw) => {
        const excludeKinds = (raw.excludeKinds ?? []) as MitigationKind[];
        const optimizeFor = (raw.optimizeFor ?? "lowest-risk") as
          "lowest-risk" | "fastest-recovery" | "lowest-latency";
        let state = currentScenario();
        if (state.phase === "INCIDENT_OPEN") state = beginInvestigation(state);
        if (state.phase === "INVESTIGATING") {
          const next = compareMitigations(state, { excludeKinds, optimizeFor });
          commitAgentScenario(next, "Agent compared mitigation candidates.");
          return rankMitigations(next, excludeKinds, optimizeFor);
        }
        return rankMitigations(state, excludeKinds, optimizeFor);
      },
    },
    stage_mitigation: {
      name: "stage_mitigation",
      title: "Stage mitigation",
      description:
        "Stage one available candidate for visible human review without changing production.",
      inputSchema: {
        type: "object",
        properties: { mitigationId: mitigationSchema },
        required: ["mitigationId"],
        additionalProperties: false,
      },
      execute: (raw) => {
        const mitigationId = requiredString(
          raw,
          "mitigationId",
        ) as MitigationId;
        const next = stageMitigation(currentScenario(), mitigationId);
        commitAgentScenario(
          next,
          `Agent staged ${mitigationId} for human review.`,
        );
        return next.stagedMitigation;
      },
    },
    discard_staged_mitigation: {
      name: "discard_staged_mitigation",
      title: "Discard staged mitigation",
      description:
        "Discard the staged mitigation and invalidate its approval binding.",
      inputSchema: {
        type: "object",
        properties: { reason: { type: "string" } },
        additionalProperties: false,
      },
      execute: () => {
        const next = discardStagedMitigation(currentScenario());
        commitAgentScenario(next, "Agent discarded the staged mitigation.");
        return { phase: next.phase, stagedMitigation: null };
      },
    },
    apply_approved_mitigation: {
      name: "apply_approved_mitigation",
      title: "Apply approved mitigation",
      description: "Apply the exact mitigation visibly approved by the human.",
      inputSchema: {
        type: "object",
        properties: { mitigationId: approvedMitigationSchema },
        required: ["mitigationId"],
        additionalProperties: false,
      },
      execute: (raw) => {
        const mitigationId = requiredString(
          raw,
          "mitigationId",
        ) as MitigationId;
        const next = applyApprovedMitigation(currentScenario(), mitigationId);
        commitAgentScenario(
          next,
          `Agent applied human-approved ${mitigationId}.`,
        );
        return { phase: next.phase, recovery: next.recovery };
      },
    },
    verify_recovery: {
      name: "verify_recovery",
      title: "Verify recovery",
      description: "Compare live telemetry with recovery thresholds.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: () => {
        const state = currentScenario();
        useRunbookStore
          .getState()
          .recordAgentInspection("Agent verified recovery thresholds.");
        return verifyRecovery(state);
      },
    },
    add_incident_note: {
      name: "add_incident_note",
      title: "Add incident note",
      description: "Add an agent-authored note to the incident timeline.",
      inputSchema: {
        type: "object",
        properties: { note: { type: "string" } },
        required: ["note"],
        additionalProperties: false,
      },
      execute: (raw) => {
        const note = requiredString(raw, "note");
        const next = addIncidentNote(currentScenario(), note);
        commitAgentScenario(next, "Agent added an incident note.", "timeline");
        return next.timeline.at(-1);
      },
    },
  };
};

export const registerToolsForPhase = (
  modelContext: WebMCPModelContext,
  phase: ApplicationPhase,
  scenario: ScenarioState = currentScenario(),
): RegisteredToolHandle => {
  const controller = new AbortController();
  const names = getRegisteredToolNames({ ...scenario, phase });
  const definitions = toolDefinitions();
  const registered = Promise.all(
    names.map((name) =>
      modelContext.registerTool(definitions[name], {
        signal: controller.signal,
      }),
    ),
  ).then(() => undefined);
  return { names, registered, unregister: () => controller.abort() };
};

export const registerGetSystemSnapshot = (
  modelContext: WebMCPModelContext,
): RegisteredToolHandle => {
  const controller = new AbortController();
  const definition = toolDefinitions().get_system_snapshot;
  const registered = modelContext.registerTool(definition, {
    signal: controller.signal,
  });
  return {
    names: ["get_system_snapshot"],
    registered,
    unregister: () => controller.abort(),
  };
};
