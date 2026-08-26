import { describe, expect, it } from "vitest";
import {
  applyApprovedMitigation,
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  discardStagedMitigation,
  stageMitigation,
} from "../../src/domain/commands";
import type { MitigationId } from "../../src/domain/types";
import { DomainError } from "../../src/domain/validation";
import { createScenarioA } from "../../src/simulation/scenario-a";

const candidateState = () =>
  compareMitigations(beginInvestigation(createScenarioA()), {
    excludeKinds: ["rollback"],
  });

describe("incident commands and approval invariant", () => {
  it("stages the canonical mitigation without mutating telemetry or config", () => {
    const before = candidateState();
    const telemetry = structuredClone(before.services);
    const config = structuredClone(before.systemConfig);
    const staged = stageMitigation(before, "M-POOL-RESTORE");

    expect(staged.services).toEqual(telemetry);
    expect(staged.systemConfig).toEqual(config);
    expect(staged.phase).toBe("AWAITING_HUMAN_APPROVAL");
    expect(staged.phaseHistory.slice(-2)).toEqual([
      "MITIGATION_STAGED",
      "AWAITING_HUMAN_APPROVAL",
    ]);
    expect(staged.stagedMitigation).toMatchObject({
      id: "M-POOL-RESTORE",
      incidentId: "INC-042",
      scenarioSeed: 42,
      status: "staged",
    });
  });

  it("rejects an excluded or stale mitigation candidate", () => {
    expect(() =>
      stageMitigation(candidateState(), "M-ROLLBACK-27"),
    ).toThrowError(expect.objectContaining({ code: "STALE_MITIGATION" }));
  });

  it("binds visible human approval to the exact staged ID", () => {
    const staged = stageMitigation(candidateState(), "M-POOL-RESTORE");
    expect(() =>
      approveStagedMitigationAsHuman(staged, "M-CACHE-DEGRADE"),
    ).toThrowError(expect.objectContaining({ code: "MITIGATION_ID_MISMATCH" }));

    const approved = approveStagedMitigationAsHuman(staged, "M-POOL-RESTORE");
    expect(approved.phase).toBe("APPROVED");
    expect(approved.stagedMitigation?.status).toBe("approved");
    expect(approved.timeline.at(-1)).toMatchObject({
      actor: "human",
      type: "approval",
    });
  });

  it("rejects apply before approval and for a different ID after approval", () => {
    const staged = stageMitigation(candidateState(), "M-POOL-RESTORE");
    expect(() =>
      applyApprovedMitigation(staged, "M-POOL-RESTORE"),
    ).toThrowError(expect.objectContaining({ code: "NOT_APPROVED" }));
    const approved = approveStagedMitigationAsHuman(staged, "M-POOL-RESTORE");
    expect(() =>
      applyApprovedMitigation(approved, "M-CACHE-DEGRADE"),
    ).toThrowError(expect.objectContaining({ code: "MITIGATION_ID_MISMATCH" }));
  });

  it("rejects approval replay against a different incident binding", () => {
    const approved = approveStagedMitigationAsHuman(
      stageMitigation(candidateState(), "M-POOL-RESTORE"),
      "M-POOL-RESTORE",
    );
    const tampered = {
      ...approved,
      stagedMitigation: approved.stagedMitigation
        ? { ...approved.stagedMitigation, incidentId: "INC-999" }
        : null,
    };
    expect(() =>
      applyApprovedMitigation(tampered, "M-POOL-RESTORE"),
    ).toThrowError(
      expect.objectContaining({ code: "INCIDENT_BINDING_MISMATCH" }),
    );
  });

  it("discard invalidates the staged binding and blocks application", () => {
    const staged = stageMitigation(candidateState(), "M-POOL-RESTORE");
    const discarded = discardStagedMitigation(staged);
    expect(discarded.phase).toBe("INVESTIGATING");
    expect(discarded.stagedMitigation).toBeNull();
    expect(discarded.incident.stagedMitigationId).toBeUndefined();
    expect(() =>
      applyApprovedMitigation(discarded, "M-POOL-RESTORE"),
    ).toThrowError(expect.objectContaining({ code: "NOT_APPROVED" }));
  });

  it("applies only the approved effect and immediately exits APPROVED", () => {
    const approved = approveStagedMitigationAsHuman(
      stageMitigation(candidateState(), "M-POOL-RESTORE"),
      "M-POOL-RESTORE",
    );
    const applied = applyApprovedMitigation(approved, "M-POOL-RESTORE");
    expect(applied.phase).toBe("MITIGATING");
    expect(applied.systemConfig).toEqual({
      inventoryRelease: "inventory-v2.7.0",
      inventoryDbPoolSize: 80,
      staleInventoryCacheSeconds: 0,
    });
    expect(applied.recovery).toEqual({
      mitigationId: "M-POOL-RESTORE",
      step: 0,
      totalSteps: 5,
    });
  });

  it("rejects unknown IDs at the type boundary", () => {
    const unknown = "M-NOT-REAL" as MitigationId;
    expect(() => stageMitigation(candidateState(), unknown)).toThrowError(
      new DomainError("UNKNOWN_MITIGATION", "Unknown mitigation M-NOT-REAL."),
    );
  });
});
