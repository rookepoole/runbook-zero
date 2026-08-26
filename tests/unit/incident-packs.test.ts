import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyApprovedMitigation,
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  stageMitigation,
} from "../../src/domain/commands";
import { traceRequestPath, verifyRecovery } from "../../src/domain/queries";
import { createScenarioFromPack } from "../../src/incidents/create-scenario";
import {
  BUNDLED_PACKS,
  CANONICAL_PACK,
  CATALOG_CACHE_PACK,
  PAYMENT_QUEUE_PACK,
} from "../../src/incidents";
import { advanceRecovery } from "../../src/simulation/engine";
import { useRunbookStore } from "../../src/state/store";
import {
  APPLY_APPROVED_MITIGATION_TOOL_NAME,
  getRegisteredToolNames,
  registerToolsForPhase,
} from "../../src/webmcp/registry";

const primaryMitigationByPack = {
  "checkout-pool-regression": "M-POOL-RESTORE",
  "payment-queue-backlog": "M-PAY-CONCURRENCY-RESTORE",
  "catalog-cache-stampede": "M-CATALOG-TTL-RESTORE",
} as const;

describe("generalized Incident Pack domain", () => {
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
  });

  it.each(BUNDLED_PACKS)(
    "executes $name through the same diagnosis, approval, and recovery commands",
    (pack) => {
      let state = createScenarioFromPack(pack);
      expect(
        traceRequestPath(state, pack.defaultFlow).primaryPath.length,
      ).toBeGreaterThan(1);

      state = beginInvestigation(state);
      state = compareMitigations(state, { excludeKinds: ["rollback"] });
      const mitigationId =
        primaryMitigationByPack[
          pack.packId as keyof typeof primaryMitigationByPack
        ];
      expect(state.mitigationComparison?.candidateIds).toContain(mitigationId);
      state = stageMitigation(state, mitigationId);

      expect(getRegisteredToolNames(state)).not.toContain(
        APPLY_APPROVED_MITIGATION_TOOL_NAME,
      );
      state = approveStagedMitigationAsHuman(state, mitigationId);
      expect(getRegisteredToolNames(state)).toContain(
        APPLY_APPROVED_MITIGATION_TOOL_NAME,
      );

      state = applyApprovedMitigation(state, mitigationId);
      expect(getRegisteredToolNames(state)).not.toContain(
        APPLY_APPROVED_MITIGATION_TOOL_NAME,
      );
      while (state.phase === "MITIGATING") state = advanceRecovery(state);

      expect(state.phase).toBe("RESOLVED");
      expect(verifyRecovery(state).recovered).toBe(true);
    },
  );

  it("returns incident-dependent results and schemas through the same WebMCP contracts", async () => {
    const results: Array<{
      incidentId: string;
      serviceIds: string[];
      flowIds: string[];
      toolNames: string[];
      candidateIds: string[];
    }> = [];

    for (const pack of [PAYMENT_QUEUE_PACK, CATALOG_CACHE_PACK]) {
      useRunbookStore.setState({
        ...useRunbookStore.getState(),
        scenario: createScenarioFromPack(pack),
        activePackId: pack.packId,
        selectedServiceId: pack.defaultServiceId,
      });
      const tools = new Map<string, WebMCPTool>();
      const modelContext = {
        registerTool: vi.fn(async (tool: WebMCPTool) => {
          tools.set(tool.name, tool);
        }),
      } as unknown as WebMCPModelContext;
      const handle = registerToolsForPhase(
        modelContext,
        "INCIDENT_OPEN",
        useRunbookStore.getState().scenario,
      );
      await handle.registered;

      const snapshot = (await tools
        .get("get_system_snapshot")
        ?.execute({})) as {
        incident: { id: string };
      };
      const inspectSchema = tools.get("inspect_service")?.inputSchema as {
        properties: { serviceId: { enum: string[] } };
      };
      const traceSchema = tools.get("trace_request_path")?.inputSchema as {
        properties: { flow: { enum: string[] } };
      };
      const stageSchema = tools.get("stage_mitigation")?.inputSchema as {
        properties: { mitigationId: { enum: string[] } };
      };
      results.push({
        incidentId: snapshot.incident.id,
        serviceIds: inspectSchema.properties.serviceId.enum,
        flowIds: traceSchema.properties.flow.enum,
        toolNames: [...tools.keys()],
        candidateIds: stageSchema.properties.mitigationId.enum,
      });
      handle.unregister();
    }

    expect(results[0].incidentId).toBe("INC-117");
    expect(results[1].incidentId).toBe("INC-203");
    expect(results[0].serviceIds).toContain("payment-consumer");
    expect(results[1].serviceIds).toContain("redis-cache");
    expect(results[0].flowIds).toEqual([
      "payment-confirmation",
      "checkout-payment",
    ]);
    expect(results[1].flowIds).toEqual(["catalog-browse", "catalog-search"]);
    expect(results[0].toolNames).toEqual(results[1].toolNames);
    expect(results[0].candidateIds).toContain("M-PAY-CONCURRENCY-RESTORE");
    expect(results[1].candidateIds).toContain("M-CATALOG-TTL-RESTORE");
  });

  it("filters apply by approval status even if the phase is inconsistent", () => {
    const state = createScenarioFromPack(CANONICAL_PACK);
    expect(
      getRegisteredToolNames({ ...state, phase: "APPROVED" }),
    ).not.toContain(APPLY_APPROVED_MITIGATION_TOOL_NAME);

    const compared = compareMitigations(beginInvestigation(state));
    const staged = stageMitigation(compared, "M-POOL-RESTORE");
    expect(
      getRegisteredToolNames({ ...staged, phase: "APPROVED" }),
    ).not.toContain(APPLY_APPROVED_MITIGATION_TOOL_NAME);
  });
});
