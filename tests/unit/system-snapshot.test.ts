import { describe, expect, it } from "vitest";
import { getSystemSnapshot } from "../../src/domain/queries";
import { createScenarioA } from "../../src/simulation/scenario-a";

describe("getSystemSnapshot", () => {
  it("returns compact incident and unhealthy service evidence", () => {
    const snapshot = getSystemSnapshot(createScenarioA());
    expect(snapshot.incident).toEqual({
      id: "INC-042",
      status: "open",
      severity: "SEV-2",
      customerImpact:
        "Checkout requests are slow and intermittently fail during inventory reservation.",
    });
    expect(
      snapshot.unhealthyServices.map((service) => service.serviceId),
    ).toEqual(["checkout", "inventory", "inventory-db", "gateway"]);
  });
});
