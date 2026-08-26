import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { createScenarioA } from "../../src/simulation/scenario-a";
import { useRunbookStore } from "../../src/state/store";

describe("Gate 1 shared interface", () => {
  beforeEach(() =>
    useRunbookStore.setState({
      scenario: createScenarioA(),
      focusedSurface: null,
      focusProvenance: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
      selectedServiceId: "checkout",
      tracedFlow: null,
    }),
  );

  it("keeps the human interface available when WebMCP is unavailable", async () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
    render(<App />);
    expect(await screen.findByText("WebMCP unavailable")).toBeVisible();
    expect(screen.getByText("Incident command")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Reset Scenario" }),
    ).toBeEnabled();
  });

  it("visibly focuses the shared overview after tool execution", async () => {
    let registeredTool: WebMCPTool | undefined;
    const modelContext = {
      registerTool: vi.fn(async (tool: WebMCPTool) => {
        if (tool.name === "get_system_snapshot") registeredTool = tool;
      }),
    } as unknown as WebMCPModelContext;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });
    render(<App />);
    expect(await screen.findByText("WebMCP Connected")).toBeVisible();
    await waitFor(() => expect(registeredTool).toBeDefined());
    await act(async () => {
      await registeredTool?.execute({});
    });
    expect(screen.getByTestId("system-overview")).toHaveClass(
      "workspace-panel--agent-focus",
    );
    expect(
      screen.getByText("Agent inspected the live system snapshot."),
    ).toBeVisible();
    expect(useRunbookStore.getState().snapshotInvocationCount).toBe(1);
  });
});
