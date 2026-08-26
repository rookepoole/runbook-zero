import { beforeEach, describe, expect, it } from "vitest";

import { createScenarioFromPack } from "../../src/incidents/create-scenario";
import {
  BUNDLED_PACKS,
  CANONICAL_PACK,
  PAYMENT_QUEUE_PACK,
} from "../../src/incidents";
import { useRunbookStore } from "../../src/state/store";

describe("local Incident Pack import and reset", () => {
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

  it("imports a valid local pack and forces it to non-canonical", () => {
    const imported = structuredClone(PAYMENT_QUEUE_PACK);
    imported.packId = "local-payment-drill";
    imported.name = "Local payment drill";
    imported.incident.id = "INC-LOCAL-01";
    imported.canonical = true;

    const result = useRunbookStore
      .getState()
      .importIncidentPackJson(JSON.stringify(imported));

    expect(result).toEqual({ ok: true, packId: "local-payment-drill" });
    expect(useRunbookStore.getState()).toMatchObject({
      activePackId: "local-payment-drill",
      scenario: { id: "INC-LOCAL-01", pack: { canonical: false } },
      importError: null,
    });
  });

  it("rejects malformed and cross-referenced packs without changing the active incident", () => {
    useRunbookStore.getState().loadIncidentPack(PAYMENT_QUEUE_PACK.packId);
    const before = useRunbookStore.getState().scenario;
    const invalid = structuredClone(PAYMENT_QUEUE_PACK) as unknown as Record<
      string,
      unknown
    >;
    const incident = invalid.incident as Record<string, unknown>;
    incident.affectedServices = ["service-that-does-not-exist"];

    const result = useRunbookStore
      .getState()
      .importIncidentPackJson(JSON.stringify(invalid));

    expect(result.ok).toBe(false);
    expect(useRunbookStore.getState().scenario).toBe(before);
    expect(useRunbookStore.getState().importError).toMatch(
      /references an unknown service/,
    );
  });

  it("rejects unsafe keys and oversized JSON safely", () => {
    const before = useRunbookStore.getState().scenario;
    const unsafe = useRunbookStore
      .getState()
      .importIncidentPackJson('{"__proto__":{"polluted":true}}');
    expect(unsafe).toMatchObject({ ok: false });
    expect(unsafe.ok ? "" : unsafe.error).toMatch(/unsafe key/);
    expect(useRunbookStore.getState().scenario).toBe(before);

    const oversized = useRunbookStore
      .getState()
      .importIncidentPackJson(" ".repeat(1_000_001));
    expect(oversized.ok ? "" : oversized.error).toMatch(/1 MB or smaller/);
    expect(useRunbookStore.getState().scenario).toBe(before);
  });

  it.each(BUNDLED_PACKS)("resets $name deterministically", (pack) => {
    const store = useRunbookStore.getState();
    store.loadIncidentPack(pack.packId);
    const pristine = createScenarioFromPack(pack);
    useRunbookStore.setState((state) => ({
      scenario: {
        ...state.scenario,
        phase: "INVESTIGATING",
        timeline: [
          ...state.scenario.timeline,
          { ...state.scenario.timeline[0], id: "MUTATED" },
        ],
      },
    }));

    useRunbookStore.getState().resetScenario();
    expect(useRunbookStore.getState().scenario).toEqual(pristine);
    expect(useRunbookStore.getState().scenario).not.toBe(pristine);
  });
});
