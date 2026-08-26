import { describe, expect, it } from "vitest";
import {
  getRecentChanges,
  rankMitigations,
  traceRequestPath,
} from "../../src/domain/queries";
import { createScenarioA } from "../../src/simulation/scenario-a";

describe("incident evidence queries", () => {
  it("traces checkout through the saturated inventory database", () => {
    const trace = traceRequestPath(createScenarioA(), "checkout");
    expect(trace.primaryPath).toEqual([
      "edge",
      "gateway",
      "checkout",
      "inventory",
      "inventory-db",
    ]);
    expect(trace.branches).toContainEqual(["checkout", "payments"]);
    expect(trace.unhealthyServices).toEqual([
      "gateway",
      "checkout",
      "inventory",
      "inventory-db",
    ]);
  });

  it("connects the incident to the deterministic pool-size change", () => {
    expect(getRecentChanges(createScenarioA())[0]).toMatchObject({
      serviceId: "inventory",
      version: "inventory-v2.7.0",
      diff: { dbPoolSize: { from: 80, to: 12 } },
    });
  });

  it("honors the no-rollback constraint and ranks the canonical fix first", () => {
    const ranked = rankMitigations(createScenarioA(), ["rollback"]);
    expect(ranked.map((option) => option.id)).toEqual([
      "M-POOL-RESTORE",
      "M-CACHE-DEGRADE",
    ]);
    expect(ranked[0]).toMatchObject({ predictedP95Ms: 420, risk: "low" });
  });
});
