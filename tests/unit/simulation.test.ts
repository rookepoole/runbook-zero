import { describe, expect, it } from "vitest";
import {
  applyApprovedMitigation,
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  stageMitigation,
} from "../../src/domain/commands";
import { verifyRecovery } from "../../src/domain/queries";
import { advanceRecovery } from "../../src/simulation/engine";
import { createScenarioA } from "../../src/simulation/scenario-a";

const appliedState = () => {
  const investigating = beginInvestigation(createScenarioA());
  const candidates = compareMitigations(investigating, {
    excludeKinds: ["rollback"],
  });
  const staged = stageMitigation(candidates, "M-POOL-RESTORE");
  const approved = approveStagedMitigationAsHuman(staged, "M-POOL-RESTORE");
  return applyApprovedMitigation(approved, "M-POOL-RESTORE");
};

describe("deterministic recovery simulation", () => {
  it("replays the same five telemetry frames on every run", () => {
    const replay = () => {
      let state = appliedState();
      const frames = [];
      for (let step = 1; step <= 5; step += 1) {
        state = advanceRecovery(state);
        frames.push({
          phase: state.phase,
          checkoutP95: state.services.checkout.p95LatencyMs,
          checkoutErrors: state.services.checkout.errorRatePct,
          inventoryP95: state.services.inventory.p95LatencyMs,
          dbSaturation: state.services["inventory-db"].saturationPct,
        });
      }
      return { state, frames };
    };

    const first = replay();
    const second = replay();
    expect(first.frames).toEqual(second.frames);
    expect(first.frames[0].dbSaturation).toBe(68);
    expect(first.frames[1].inventoryP95).toBe(760);
    expect(first.frames[2].checkoutErrors).toBe(0.8);
    expect(first.frames[3].checkoutP95).toBe(420);
    expect(first.state.phase).toBe("RESOLVED");
    expect(first.state.incident.status).toBe("resolved");
    expect(
      Math.max(
        ...Object.values(first.state.services).map(
          (service) => service.p95LatencyMs,
        ),
      ),
    ).toBeLessThanOrEqual(500);
    expect(
      Math.max(
        ...Object.values(first.state.services).map(
          (service) => service.errorRatePct,
        ),
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      Object.values(first.state.services).every(
        (service) => service.health === "healthy",
      ),
    ).toBe(true);
    expect(verifyRecovery(first.state)).toEqual({
      recovered: true,
      checks: [
        {
          metric: "checkout.p95LatencyMs",
          value: 420,
          threshold: 500,
          pass: true,
        },
        {
          metric: "checkout.errorRatePct",
          value: 0.8,
          threshold: 1,
          pass: true,
        },
        {
          metric: "inventory-db.saturationPct",
          value: 55,
          threshold: 70,
          pass: true,
        },
      ],
    });
  });

  it("cannot advance before a mitigation is approved and applied", () => {
    expect(() => advanceRecovery(createScenarioA())).toThrowError(
      expect.objectContaining({ code: "INVALID_PHASE" }),
    );
  });
});
