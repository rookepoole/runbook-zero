import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  stageMitigation,
} from "../../src/domain/commands";
import type { ApplicationPhase } from "../../src/domain/types";
import { createScenarioA } from "../../src/simulation/scenario-a";
import { useRunbookStore } from "../../src/state/store";
import {
  APPLY_APPROVED_MITIGATION_TOOL_NAME,
  getActiveToolNames,
  registerToolsForPhase,
} from "../../src/webmcp/registry";
import { useWebMCPRegistry } from "../../src/webmcp/use-webmcp-registry";

const base = [
  "get_system_snapshot",
  "inspect_service",
  "query_signals",
  "trace_request_path",
  "get_recent_changes",
];
const incident = [
  ...base,
  "set_working_hypothesis",
  "compare_mitigations",
  "stage_mitigation",
  "add_incident_note",
];
const recovered = [...base, "verify_recovery", "add_incident_note"];

describe("Gate 3 dynamic WebMCP registry", () => {
  beforeEach(() => {
    useRunbookStore.getState().resetScenario();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it.each<[ApplicationPhase, string[]]>([
    ["BOOT", base],
    ["HEALTHY", base],
    ["INCIDENT_OPEN", incident],
    ["INVESTIGATING", incident],
    ["MITIGATION_CANDIDATES", incident],
    ["MITIGATION_STAGED", [...incident, "discard_staged_mitigation"]],
    ["AWAITING_HUMAN_APPROVAL", [...incident, "discard_staged_mitigation"]],
    [
      "APPROVED",
      [
        ...base,
        "set_working_hypothesis",
        "compare_mitigations",
        "apply_approved_mitigation",
        "verify_recovery",
        "add_incident_note",
      ],
    ],
    ["MITIGATING", recovered],
    ["RESOLVED", recovered],
    ["POSTMORTEM_READY", recovered],
  ])("returns the exact active tools for %s", (phase, expected) => {
    expect(getActiveToolNames(phase)).toEqual(expected);
  });

  it("never exposes apply while awaiting approval", () => {
    expect(getActiveToolNames("AWAITING_HUMAN_APPROVAL")).not.toContain(
      APPLY_APPROVED_MITIGATION_TOOL_NAME,
    );
    expect(getActiveToolNames("APPROVED")).toContain(
      APPLY_APPROVED_MITIGATION_TOOL_NAME,
    );
  });

  it("registers each phase surface under one abortable lifecycle", async () => {
    const registrations: Array<{ tool: WebMCPTool; signal?: AbortSignal }> = [];
    const modelContext = {
      registerTool: vi.fn(
        async (tool: WebMCPTool, options?: { signal?: AbortSignal }) => {
          registrations.push({ tool, signal: options?.signal });
        },
      ),
    } as unknown as WebMCPModelContext;
    const handle = registerToolsForPhase(
      modelContext,
      "AWAITING_HUMAN_APPROVAL",
    );
    await handle.registered;
    expect(registrations.map(({ tool }) => tool.name)).toEqual(handle.names);
    expect(registrations).toHaveLength(10);
    expect(registrations.every(({ signal }) => signal?.aborted === false)).toBe(
      true,
    );
    handle.unregister();
    expect(registrations.every(({ signal }) => signal?.aborted === true)).toBe(
      true,
    );
  });

  it("aborts stale tools on phase change and removes apply after execution", async () => {
    const registrations: Array<{ tool: WebMCPTool; signal?: AbortSignal }> = [];
    const modelContext = {
      registerTool: vi.fn(
        async (tool: WebMCPTool, options?: { signal?: AbortSignal }) => {
          registrations.push({ tool, signal: options?.signal });
        },
      ),
    } as unknown as WebMCPModelContext;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });

    const { result } = renderHook(() => useWebMCPRegistry());
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "connected",
        activeToolCount: 9,
      }),
    );
    const incidentRegistrations = [...registrations];

    const investigating = beginInvestigation(createScenarioA());
    const candidates = compareMitigations(investigating, {
      excludeKinds: ["rollback"],
    });
    const staged = stageMitigation(candidates, "M-POOL-RESTORE");
    const approved = approveStagedMitigationAsHuman(staged, "M-POOL-RESTORE");
    act(() => useRunbookStore.setState({ scenario: approved }));

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "connected",
        activeToolCount: 10,
      }),
    );
    expect(
      incidentRegistrations.every(({ signal }) => signal?.aborted === true),
    ).toBe(true);

    const approvedApply = registrations.find(
      ({ tool, signal }) =>
        tool.name === APPLY_APPROVED_MITIGATION_TOOL_NAME && !signal?.aborted,
    );
    expect(approvedApply).toBeDefined();
    await act(async () => {
      await approvedApply?.tool.execute({ mitigationId: "M-POOL-RESTORE" });
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "connected",
        activeToolCount: 7,
      }),
    );
    expect(approvedApply?.signal?.aborted).toBe(true);
    expect(useRunbookStore.getState().scenario.phase).toBe("MITIGATING");
    expect(
      registrations.some(
        ({ tool, signal }) =>
          tool.name === APPLY_APPROVED_MITIGATION_TOOL_NAME && !signal?.aborted,
      ),
    ).toBe(false);
  });
});
