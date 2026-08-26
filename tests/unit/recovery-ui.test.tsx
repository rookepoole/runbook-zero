import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import {
  applyApprovedMitigation,
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  stageMitigation,
} from "../../src/domain/commands";
import { createScenarioA } from "../../src/simulation/scenario-a";
import { useRunbookStore } from "../../src/state/store";

const createAppliedState = () => {
  const investigating = beginInvestigation(createScenarioA());
  const candidates = compareMitigations(investigating, {
    excludeKinds: ["rollback"],
  });
  const staged = stageMitigation(candidates, "M-POOL-RESTORE");
  const approved = approveStagedMitigationAsHuman(staged, "M-POOL-RESTORE");
  return applyApprovedMitigation(approved, "M-POOL-RESTORE");
};

describe("visible deterministic recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
    useRunbookStore.setState({
      scenario: createAppliedState(),
      focusedSurface: "telemetry",
      lastAgentAction: "Agent applied human-approved M-POOL-RESTORE.",
      snapshotInvocationCount: 0,
      selectedServiceId: "checkout",
      tracedFlow: "checkout",
    });
  });

  afterEach(() => vi.useRealTimers());

  it("renders each fixed frame and resolves after five seconds", async () => {
    render(<App />);
    expect(screen.getByText("Recovery frame 0 / 5")).toBeVisible();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByText("Recovery frame 1 / 5")).toBeVisible();
    expect(
      useRunbookStore.getState().scenario.services["inventory-db"],
    ).toMatchObject({
      saturationPct: 68,
    });

    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(screen.getByText("Recovery frame 4 / 5")).toBeVisible();
    expect(useRunbookStore.getState().scenario.services.checkout).toMatchObject(
      {
        p95LatencyMs: 420,
        errorRatePct: 0.8,
      },
    );

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(
      screen.getByText("✓ Recovery thresholds satisfied · incident resolved"),
    ).toBeVisible();
    expect(screen.getAllByText("RESOLVED")).toHaveLength(2);
    expect(useRunbookStore.getState().scenario).toMatchObject({
      phase: "RESOLVED",
      incident: { status: "resolved" },
      recovery: { step: 5 },
    });
  });
});
