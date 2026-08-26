import { describe, expect, it } from "vitest";
import { createScenarioA } from "../../src/simulation/scenario-a";

describe("Scenario A", () => {
  it("initializes INC-042 deterministically", () => {
    const first = createScenarioA();
    const second = createScenarioA();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.id).toBe("INC-042");
    expect(first.services.checkout.p95LatencyMs).toBe(4700);
    expect(first.services.checkout.errorRatePct).toBe(17);
    expect(first.services["inventory-db"].saturationPct).toBe(97);
  });
});
