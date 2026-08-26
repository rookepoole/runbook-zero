import { describe, expect, it } from "vitest";
import { createScenarioA } from "../../src/simulation/scenario-a";

describe("Scenario A", () => {
  it("initializes INC-042 deterministically", () => {
    const first = createScenarioA();
    const second = createScenarioA();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.services).not.toBe(second.services);
    expect(first.services.checkout).not.toBe(second.services.checkout);
    expect(first.mitigationOptions["M-POOL-RESTORE"]).not.toBe(
      second.mitigationOptions["M-POOL-RESTORE"],
    );
    expect(first.id).toBe("INC-042");
    expect(first.phaseHistory).toEqual(["BOOT", "HEALTHY", "INCIDENT_OPEN"]);
    expect(first.services.checkout.p95LatencyMs).toBe(4700);
    expect(first.services.checkout.errorRatePct).toBe(17);
    expect(first.services["inventory-db"].saturationPct).toBe(97);
    expect(first.systemConfig.inventoryDbPoolSize).toBe(12);
    expect(first.baselineConfig.inventoryDbPoolSize).toBe(80);
    expect(first.changes[0].diff).toEqual({
      dbPoolSize: { from: 80, to: 12 },
    });
  });
});
