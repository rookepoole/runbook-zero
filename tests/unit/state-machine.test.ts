import { describe, expect, it } from "vitest";
import { canTransition, transitionPhase } from "../../src/domain/state-machine";
import { DomainError } from "../../src/domain/validation";
import { createScenarioA } from "../../src/simulation/scenario-a";

describe("canonical incident state machine", () => {
  it("allows the frozen canonical path and records every phase", () => {
    let state = createScenarioA();
    for (const phase of [
      "INVESTIGATING",
      "MITIGATION_CANDIDATES",
      "MITIGATION_STAGED",
      "AWAITING_HUMAN_APPROVAL",
      "APPROVED",
      "MITIGATING",
      "RESOLVED",
      "POSTMORTEM_READY",
    ] as const) {
      state = transitionPhase(state, phase);
    }
    expect(state.phaseHistory).toEqual([
      "BOOT",
      "HEALTHY",
      "INCIDENT_OPEN",
      "INVESTIGATING",
      "MITIGATION_CANDIDATES",
      "MITIGATION_STAGED",
      "AWAITING_HUMAN_APPROVAL",
      "APPROVED",
      "MITIGATING",
      "RESOLVED",
      "POSTMORTEM_READY",
    ]);
  });

  it("permits discard only back to investigation", () => {
    expect(canTransition("AWAITING_HUMAN_APPROVAL", "INVESTIGATING")).toBe(
      true,
    );
    expect(canTransition("AWAITING_HUMAN_APPROVAL", "MITIGATING")).toBe(false);
  });

  it("rejects an invalid phase jump", () => {
    expect(() => transitionPhase(createScenarioA(), "APPROVED")).toThrowError(
      new DomainError(
        "INVALID_PHASE",
        "Cannot transition from INCIDENT_OPEN to APPROVED.",
      ),
    );
  });
});
