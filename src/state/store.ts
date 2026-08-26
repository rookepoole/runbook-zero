import { create } from "zustand";

import type { ScenarioState } from "../domain/types";
import { createScenarioA } from "../simulation/scenario-a";

type FocusTarget = "system-overview" | null;

interface RunbookState {
  scenario: ScenarioState;
  focusedSurface: FocusTarget;
  lastAgentAction: string | null;
  snapshotInvocationCount: number;
  focusSystemOverviewFromAgent: () => void;
  resetScenario: () => void;
}

export const useRunbookStore = create<RunbookState>((set) => ({
  scenario: createScenarioA(),
  focusedSurface: null,
  lastAgentAction: null,
  snapshotInvocationCount: 0,
  focusSystemOverviewFromAgent: () =>
    set((state) => ({
      focusedSurface: "system-overview",
      lastAgentAction: "Agent inspected the live system snapshot.",
      snapshotInvocationCount: state.snapshotInvocationCount + 1,
    })),
  resetScenario: () =>
    set({
      scenario: createScenarioA(),
      focusedSurface: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
    }),
}));
