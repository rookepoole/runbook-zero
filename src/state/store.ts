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
import { createScenarioA } from "../simulation/scenario-a";

export type FocusTarget =
  | "system-overview"
  | "incident-command"
  | "topology"
  | "telemetry"
  | "timeline"
  | null;

interface RunbookState {
  scenario: ScenarioState;
  focusedSurface: FocusTarget;
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
  approveStagedMitigation: (mitigationId: MitigationId) => void;
  discardStagedMitigationAsHuman: () => void;
  resetScenario: () => void;
}

export const useRunbookStore = create<RunbookState>((set) => ({
  scenario: createScenarioA(),
  focusedSurface: null,
  lastAgentAction: null,
  snapshotInvocationCount: 0,
  selectedServiceId: "checkout",
  tracedFlow: null,
  focusSystemOverviewFromAgent: () =>
    set((state) => ({
      focusedSurface: "system-overview",
      lastAgentAction: "Agent inspected the live system snapshot.",
      snapshotInvocationCount: state.snapshotInvocationCount + 1,
    })),
  commitAgentScenario: (
    scenario,
    action,
    focusedSurface = "incident-command",
  ) => set({ scenario, focusedSurface, lastAgentAction: action }),
  recordAgentInspection: (
    action,
    focusedSurface = "incident-command",
    selectedServiceId,
    tracedFlow,
  ) =>
    set((state) => ({
      focusedSurface,
      lastAgentAction: action,
      selectedServiceId: selectedServiceId ?? state.selectedServiceId,
      tracedFlow: tracedFlow ?? state.tracedFlow,
    })),
  selectService: (selectedServiceId) =>
    set({ selectedServiceId, focusedSurface: "telemetry" }),
  approveStagedMitigation: (mitigationId) =>
    set((state) => ({
      scenario: approveStagedMitigationAsHuman(state.scenario, mitigationId),
      focusedSurface: "incident-command",
      lastAgentAction: null,
    })),
  discardStagedMitigationAsHuman: () =>
    set((state) => ({
      scenario: discardStagedMitigation(state.scenario, "human"),
      focusedSurface: "incident-command",
      lastAgentAction: null,
    })),
  resetScenario: () =>
    set({
      scenario: createScenarioA(),
      focusedSurface: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
      selectedServiceId: "checkout",
      tracedFlow: null,
    }),
}));
