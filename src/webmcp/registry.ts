import { getSystemSnapshot } from "../domain/queries";
import { useRunbookStore } from "../state/store";

export const GET_SYSTEM_SNAPSHOT_TOOL_NAME = "get_system_snapshot";

export interface RegisteredToolHandle {
  unregister: () => void;
  registered: Promise<void>;
}

export const registerGetSystemSnapshot = (
  modelContext: WebMCPModelContext,
): RegisteredToolHandle => {
  const controller = new AbortController();
  const registered = modelContext.registerTool(
    {
      name: GET_SYSTEM_SNAPSHOT_TOOL_NAME,
      title: "Get system snapshot",
      description:
        "Inspect the active incident and unhealthy services. Use this first to understand current system health without changing state.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const state = useRunbookStore.getState();
        const result = getSystemSnapshot(state.scenario);
        state.focusSystemOverviewFromAgent();
        return result;
      },
    },
    { signal: controller.signal },
  );

  return { registered, unregister: () => controller.abort() };
};
