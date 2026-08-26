import { create } from "zustand";

import {
  approveStagedMitigationAsHuman,
  discardStagedMitigation,
} from "../domain/commands";
import type {
  IncidentPack,
  MitigationId,
  ScenarioState,
  ServiceId,
  UserFlow,
} from "../domain/types";
import { createScenarioFromPack } from "../incidents/create-scenario";
import { BUNDLED_PACKS, CANONICAL_PACK } from "../incidents";
import {
  IncidentPackValidationError,
  parseIncidentPackJson,
} from "../incidents/validation";
import { advanceRecovery } from "../simulation/engine";

export type FocusTarget =
  | "system-overview"
  | "incident-command"
  | "topology"
  | "telemetry"
  | "timeline"
  | null;
export type FocusProvenance = "agent" | "human" | null;

export type ImportIncidentPackResult =
  { ok: true; packId: string } | { ok: false; error: string };

interface RunbookState {
  scenario: ScenarioState;
  incidentPacks: IncidentPack[];
  activePackId: string;
  importError: string | null;
  focusedSurface: FocusTarget;
  focusProvenance: FocusProvenance;
  lastAgentAction: string | null;
  snapshotInvocationCount: number;
  selectedServiceId: ServiceId;
  tracedFlow: UserFlow | null;
  focusSystemOverviewFromAgent: () => void;
  commitAgentScenario: (
    scenario: ScenarioState,
    action: string,
    focusedSurface?: FocusTarget,
  ) => void;
  recordAgentInspection: (
    action: string,
    focusedSurface?: FocusTarget,
    selectedServiceId?: ServiceId,
    tracedFlow?: UserFlow,
  ) => void;
  selectService: (serviceId: ServiceId) => void;
  toggleHumanFocus: (
    target: Exclude<FocusTarget, "system-overview" | null>,
  ) => void;
  clearFocus: () => void;
  approveStagedMitigation: (mitigationId: MitigationId) => void;
  discardStagedMitigationAsHuman: () => void;
  advanceRecoveryFrame: () => void;
  loadIncidentPack: (packId: string) => void;
  importIncidentPackJson: (json: string) => ImportIncidentPackResult;
  dismissImportError: () => void;
  resetScenario: () => void;
}

const workspaceReset = (pack: IncidentPack) => ({
  scenario: createScenarioFromPack(pack),
  activePackId: pack.packId,
  focusedSurface: null,
  focusProvenance: null,
  lastAgentAction: null,
  snapshotInvocationCount: 0,
  selectedServiceId: pack.defaultServiceId,
  tracedFlow: null,
  importError: null,
});

export const useRunbookStore = create<RunbookState>((set, get) => ({
  ...workspaceReset(CANONICAL_PACK),
  incidentPacks: BUNDLED_PACKS,
  focusSystemOverviewFromAgent: () =>
    set((state) => ({
      focusedSurface: "system-overview",
      focusProvenance: "agent",
      lastAgentAction: "Agent inspected the live system snapshot.",
      snapshotInvocationCount: state.snapshotInvocationCount + 1,
    })),
  commitAgentScenario: (
    scenario,
    action,
    focusedSurface = "incident-command",
  ) =>
    set({
      scenario,
      focusedSurface,
      focusProvenance: "agent",
      lastAgentAction: action,
    }),
  recordAgentInspection: (
    action,
    focusedSurface = "incident-command",
    selectedServiceId,
    tracedFlow,
  ) =>
    set((state) => ({
      focusedSurface,
      focusProvenance: "agent",
      lastAgentAction: action,
      selectedServiceId: selectedServiceId ?? state.selectedServiceId,
      tracedFlow: tracedFlow ?? state.tracedFlow,
    })),
  selectService: (selectedServiceId) =>
    set({
      selectedServiceId,
      focusedSurface: "telemetry",
      focusProvenance: "human",
      lastAgentAction: null,
    }),
  toggleHumanFocus: (target) =>
    set((state) =>
      state.focusedSurface === target && state.focusProvenance === "human"
        ? { focusedSurface: null, focusProvenance: null }
        : {
            focusedSurface: target,
            focusProvenance: "human",
            lastAgentAction: null,
          },
    ),
  clearFocus: () => set({ focusedSurface: null, focusProvenance: null }),
  approveStagedMitigation: (mitigationId) =>
    set((state) => ({
      scenario: approveStagedMitigationAsHuman(state.scenario, mitigationId),
      focusedSurface: "incident-command",
      focusProvenance: "human",
      lastAgentAction: null,
    })),
  discardStagedMitigationAsHuman: () =>
    set((state) => ({
      scenario: discardStagedMitigation(state.scenario, "human"),
      focusedSurface: "incident-command",
      focusProvenance: "human",
      lastAgentAction: null,
    })),
  advanceRecoveryFrame: () =>
    set((state) =>
      state.scenario.phase === "MITIGATING"
        ? {
            scenario: advanceRecovery(state.scenario),
            focusedSurface: "telemetry" as const,
            focusProvenance: "agent" as const,
          }
        : state,
    ),
  loadIncidentPack: (packId) => {
    const pack = get().incidentPacks.find((item) => item.packId === packId);
    if (!pack) return;
    set(workspaceReset(pack));
  },
  importIncidentPackJson: (json) => {
    try {
      const imported = parseIncidentPackJson(json);
      if (get().incidentPacks.some((pack) => pack.packId === imported.packId)) {
        throw new IncidentPackValidationError(
          `pack.packId: ${imported.packId} is already loaded`,
        );
      }
      const localPack = { ...imported, canonical: false };
      set((state) => ({
        ...workspaceReset(localPack),
        incidentPacks: [...state.incidentPacks, localPack],
      }));
      return { ok: true, packId: localPack.packId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Incident Pack import failed.";
      set({ importError: message });
      return { ok: false, error: message };
    }
  },
  dismissImportError: () => set({ importError: null }),
  resetScenario: () => {
    const state = get();
    const pack =
      state.incidentPacks.find((item) => item.packId === state.activePackId) ??
      CANONICAL_PACK;
    set(workspaceReset(pack));
  },
}));
