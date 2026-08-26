import { create } from "zustand";

import {
  approveStagedMitigationAsHuman,
  discardStagedMitigation,
} from "../domain/commands";
import type {
  MitigationId,
  ScenarioState,
  ServiceId,
  UserFlow,
} from "../domain/types";
import { advanceRecovery } from "../simulation/engine";
import { createScenarioA } from "../simulation/scenario-a";

export type FocusTarget =
  | "system-overview"
  | "incident-command"
  | "topology"
  | "telemetry"
  | "timeline"
  | null;
export type FocusProvenance = "agent" | "human" | null;

interface RunbookState {
  scenario: ScenarioState;
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
  resetScenario: () => void;
}

export const useRunbookStore = create<RunbookState>((set) => ({
  scenario: createScenarioA(),
  focusedSurface: null,
  focusProvenance: null,
  lastAgentAction: null,
  snapshotInvocationCount: 0,
  selectedServiceId: "checkout",
  tracedFlow: null,
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
  resetScenario: () =>
    set({
      scenario: createScenarioA(),
      focusedSurface: null,
      focusProvenance: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
      selectedServiceId: "checkout",
      tracedFlow: null,
    }),
}));
