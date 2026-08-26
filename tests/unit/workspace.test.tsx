import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { createScenarioA } from "../../src/simulation/scenario-a";
import { useRunbookStore } from "../../src/state/store";

describe("shared incident workspace", () => {
  const activeTools = new Map<string, WebMCPTool>();

  beforeEach(() => {
    activeTools.clear();
    useRunbookStore.setState({
      scenario: createScenarioA(),
      focusedSurface: null,
      focusProvenance: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
      selectedServiceId: "checkout",
      tracedFlow: null,
    });
    const modelContext = {
      registerTool: vi.fn(
        async (tool: WebMCPTool, options?: { signal?: AbortSignal }) => {
          activeTools.set(tool.name, tool);
          options?.signal?.addEventListener(
            "abort",
            () => {
              if (activeTools.get(tool.name) === tool)
                activeTools.delete(tool.name);
            },
            { once: true },
          );
        },
      ),
    } as unknown as WebMCPModelContext;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });
  });

  it("renders the four frozen operational regions", async () => {
    render(<App />);
    expect(await screen.findByText("Service topology")).toBeVisible();
    expect(screen.getByText("Incident command")).toBeVisible();
    expect(screen.getByText("Telemetry / signals")).toBeVisible();
    expect(screen.getByText("Change + incident timeline")).toBeVisible();
    expect(screen.getByText("4 / 11 services")).toBeVisible();
    expect(screen.getByText("Checkout dependency graph")).toBeVisible();
    expect(
      screen.getAllByRole("img", { name: /trend from baseline/i }),
    ).toHaveLength(4);
    expect(screen.getByText("START WITH YOUR AGENT")).toBeVisible();
    expect(
      screen.getByText(
        /Checkout latency spiked after this morning's deployment/,
      ),
    ).toBeVisible();
  });

  it("explains empty provenance filters and points back to the agent brief", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "agent" }));
    expect(
      screen.getByText(
        "No agent actions yet. Start with the agent brief in Incident command.",
      ),
    ).toBeVisible();
  });

  it("supports inspectable evidence and keyboard-dismissable focus mode", async () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Focus topology panel" }),
    );
    expect(screen.getByText(/FOCUS MODE · topology/i)).toBeVisible();
    expect(screen.getAllByText("gateway").length).toBeGreaterThan(0);
    expect(screen.getByText("payments, inventory")).toBeVisible();

    act(() => fireEvent.keyDown(window, { key: "Escape" }));
    expect(
      screen.queryByText(/FOCUS MODE · topology/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Inspect exact change"));
    expect(screen.getByText("dbPoolSize 80")).toBeVisible();
    expect(screen.getByText("dbPoolSize 12")).toBeVisible();
  });

  it("visibly mirrors diagnosis, constrained comparison, and staging", async () => {
    render(<App />);
    await waitFor(() => expect(activeTools.size).toBe(9));

    await act(async () => {
      await activeTools.get("set_working_hypothesis")?.execute({
        summary:
          "inventory-v2.7.0 reduced dbPoolSize from 80 to 12, saturating inventory-db.",
        confidence: "high",
        evidenceIds: ["CHG-271", "inventory-db.saturationPct"],
      });
    });
    expect(
      screen.getAllByText(
        "inventory-v2.7.0 reduced dbPoolSize from 80 to 12, saturating inventory-db.",
      ),
    ).toHaveLength(2);
    expect(screen.getByText("HIGH CONFIDENCE")).toBeVisible();
    expect(screen.getAllByText("CHG-271").length).toBeGreaterThan(0);
    expect(screen.getByText("inventory-db.saturationPct")).toBeVisible();
    expect(
      screen.getByText("Agent recorded a working hypothesis."),
    ).toBeVisible();

    await act(async () => {
      await activeTools.get("compare_mitigations")?.execute({
        excludeKinds: ["rollback"],
        optimizeFor: "lowest-risk",
      });
    });
    expect(await screen.findByText("ROLLBACK EXCLUDED")).toBeVisible();
    expect(screen.getByText("Restore inventory database pool")).toBeVisible();
    expect(
      screen.queryByText("Rollback inventory-v2.7.0"),
    ).not.toBeInTheDocument();

    await act(async () => {
      await activeTools
        .get("stage_mitigation")
        ?.execute({ mitigationId: "M-POOL-RESTORE" });
    });
    expect(await screen.findByText("STAGED — NOT APPLIED")).toBeVisible();
    expect(screen.getByText("dbPoolSize 12 → 80")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Approve staged mitigation" }),
    ).toBeEnabled();
    expect(activeTools.has("apply_approved_mitigation")).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Approve staged mitigation" }),
    );
    expect(await screen.findByText("✓ HUMAN APPROVED")).toBeVisible();
    await waitFor(() =>
      expect(activeTools.has("apply_approved_mitigation")).toBe(true),
    );
    expect(useRunbookStore.getState().scenario.timeline.at(-1)).toMatchObject({
      actor: "human",
      type: "approval",
    });
  });
});
