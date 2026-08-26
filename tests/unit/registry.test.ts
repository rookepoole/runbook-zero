import { beforeEach, describe, expect, it, vi } from "vitest";
import { createScenarioA } from "../../src/simulation/scenario-a";
import { useRunbookStore } from "../../src/state/store";
import {
  GET_SYSTEM_SNAPSHOT_TOOL_NAME,
  registerGetSystemSnapshot,
} from "../../src/webmcp/registry";

describe("Gate 1 WebMCP registry seam", () => {
  beforeEach(() =>
    useRunbookStore.setState({
      scenario: createScenarioA(),
      focusedSurface: null,
      lastAgentAction: null,
      snapshotInvocationCount: 0,
    }),
  );
  it("registers the real tool contract and unregisters through AbortSignal", async () => {
    let registeredTool: WebMCPTool | undefined;
    let registrationSignal: AbortSignal | undefined;
    const registerTool = vi.fn(
      async (tool: WebMCPTool, options?: { signal?: AbortSignal }) => {
        registeredTool = tool;
        registrationSignal = options?.signal;
      },
    );
    const handle = registerGetSystemSnapshot({
      registerTool,
    } as unknown as WebMCPModelContext);
    await handle.registered;
    expect(registerTool).toHaveBeenCalledOnce();
    expect(registeredTool?.name).toBe(GET_SYSTEM_SNAPSHOT_TOOL_NAME);
    expect(registeredTool?.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    expect(handle.names).toEqual([GET_SYSTEM_SNAPSHOT_TOOL_NAME]);
    const result = await registeredTool?.execute({});
    expect(result).toMatchObject({
      incident: { id: "INC-042", severity: "SEV-2" },
    });
    expect(useRunbookStore.getState()).toMatchObject({
      focusedSurface: "system-overview",
      snapshotInvocationCount: 1,
    });
    handle.unregister();
    expect(registrationSignal?.aborted).toBe(true);
  });
});
