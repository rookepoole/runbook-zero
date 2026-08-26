import { readFileSync } from "node:fs";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../../src/App";
import { createScenarioFromPack } from "../../src/incidents/create-scenario";
import { BUNDLED_PACKS, CANONICAL_PACK } from "../../src/incidents";
import { useRunbookStore } from "../../src/state/store";

const presentationFiles = [
  "../../src/App.tsx",
  "../../src/components/IncidentCommand/IncidentCommand.tsx",
  "../../src/components/IncidentLauncher/IncidentLauncher.tsx",
  "../../src/components/CapabilityFirewall/CapabilityFirewall.tsx",
  "../../src/components/TelemetryPanel/TelemetryPanel.tsx",
  "../../src/components/TimelinePanel/TimelinePanel.tsx",
  "../../src/components/TopologyPanel/TopologyPanel.tsx",
  "../../src/components/WebMCPStatus/WebMCPStatus.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("Incident Pack presentation", () => {
  beforeEach(() => {
    useRunbookStore.setState({
      incidentPacks: BUNDLED_PACKS,
      activePackId: CANONICAL_PACK.packId,
      scenario: createScenarioFromPack(CANONICAL_PACK),
      importError: null,
      focusedSurface: null,
      focusProvenance: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
      selectedServiceId: CANONICAL_PACK.defaultServiceId,
      tracedFlow: null,
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("contains no canonical-scenario assumptions in presentation source", () => {
    const source = presentationFiles.join("\n");
    for (const assumption of [
      "INC-042",
      "inventory",
      "dbPoolSize",
      "CHG-271",
      "M-POOL",
      "checkout",
    ]) {
      expect(source).not.toContain(assumption);
    }
  });

  it("launches every bundled incident through one workspace", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Incident Packs" }));

    expect(screen.getByText("Checkout pool regression")).toBeVisible();
    expect(screen.getByText("Payment event queue backlog")).toBeVisible();
    expect(screen.getByText("Catalog cache stampede")).toBeVisible();
    expect(screen.getByText(/file is never uploaded/i)).toBeVisible();

    const paymentCard = screen
      .getByText("Payment event queue backlog")
      .closest("article");
    expect(paymentCard).not.toBeNull();
    fireEvent.click(
      Array.from(paymentCard!.querySelectorAll("button")).find(
        (button) => button.textContent === "Launch incident",
      ) as HTMLButtonElement,
    );

    expect(screen.getByText("INC-117")).toBeVisible();
    expect(
      screen.getByText("Payment confirmation dependency graph"),
    ).toBeVisible();
    expect(screen.getAllByText("payment-consumer").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/event backlog/i).length).toBeGreaterThan(0);
  });

  it("makes the capability firewall and human authority state visible", () => {
    render(<App />);
    expect(screen.getByText("Capability firewall")).toBeVisible();
    expect(
      screen.getByText("No consequential change authorized"),
    ).toBeVisible();
    expect(screen.getByText("HUMAN ONLY")).toBeVisible();
    expect(screen.getByText("approve staged mitigation")).toBeVisible();
  });
});
