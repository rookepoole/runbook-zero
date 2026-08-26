import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createElement } from "react";

import { render, screen } from "@testing-library/react";
import { afterAll, describe, expect, it } from "vitest";

import App from "../../src/App";
import {
  applyApprovedMitigation,
  approveStagedMitigationAsHuman,
  beginInvestigation,
  compareMitigations,
  recordExternalExecution,
  stageMitigation,
} from "../../src/domain/commands";
import type { IncidentPack } from "../../src/domain/types";
import { createScenarioFromPack } from "../../src/incidents/create-scenario";
import { validateIncidentPack } from "../../src/incidents/validation";
import { useRunbookStore } from "../../src/state/store";
import { getRegisteredToolNames } from "../../src/webmcp/registry";

const root = resolve(import.meta.dirname, "../..");
const builder = resolve(
  root,
  "plugins/runbook-zero/scripts/build-live-incident-pack.mjs",
);
const capture = resolve(root, "tests/fixtures/site-capture-webmcp.json");
const outputs: string[] = [];

const build = (input = capture): IncidentPack => {
  const output = resolve(
    tmpdir(),
    `runbook-zero-${process.pid}-${outputs.length}.json`,
  );
  outputs.push(output);
  execFileSync(process.execPath, [
    builder,
    "--input",
    input,
    "--output",
    output,
  ]);
  return validateIncidentPack(JSON.parse(readFileSync(output, "utf8")));
};

afterAll(() => {
  outputs.forEach((output) => rmSync(output, { force: true }));
});

describe("installable live-site product", () => {
  it("builds the same deterministic pack from the same browser capture", () => {
    const first = build();
    const second = build();

    expect(second).toEqual(first);
    expect(first.source).toMatchObject({
      kind: "live-site",
      origin: "https://shop.example.test",
      capturedBy: "codex-browser-extension",
    });
    expect(
      first.mitigationCandidates["M-RETRY-CONFIRMATION"].execution,
    ).toEqual({
      mode: "external-webmcp",
      targetOrigin: "https://shop.example.test",
      toolName: "retry_order_confirmation",
      input: { orderId: "123" },
    });
    expect(
      first.mitigationEffects["M-RETRY-CONFIRMATION"].recoveryFrames,
    ).toEqual([]);
  });

  it("degrades safely to an operator handoff on sites without WebMCP", () => {
    const noTools = JSON.parse(readFileSync(capture, "utf8")) as Record<
      string,
      unknown
    >;
    noTools.webMcpTools = [];
    noTools.candidateActions = [];
    noTools.operatorHandoff = [
      "Escalate the captured evidence to the site owner without changing the page.",
    ];
    const input = resolve(
      tmpdir(),
      `runbook-zero-no-tools-${process.pid}.json`,
    );
    outputs.push(input);
    writeFileSync(input, JSON.stringify(noTools));

    const pack = build(input);

    expect(pack.source).toMatchObject({
      kind: "live-site",
      observedWebMCPTools: [],
    });
    expect(pack.mitigationCandidates["M-OPERATOR-HANDOFF"].execution).toEqual({
      mode: "operator-handoff",
      targetOrigin: "https://shop.example.test",
      instructions: [
        "Escalate the captured evidence to the site owner without changing the page.",
      ],
    });
  });

  it("keeps the external action unavailable until exact human approval", () => {
    let state = createScenarioFromPack(build());
    state = beginInvestigation(state);
    state = compareMitigations(state);
    state = stageMitigation(state, "M-RETRY-CONFIRMATION");

    expect(getRegisteredToolNames(state)).not.toContain(
      "apply_approved_mitigation",
    );
    expect(() =>
      applyApprovedMitigation(state, "M-RETRY-CONFIRMATION"),
    ).toThrow(/before human approval/i);

    state = approveStagedMitigationAsHuman(state, "M-RETRY-CONFIRMATION");
    expect(getRegisteredToolNames(state)).toContain(
      "apply_approved_mitigation",
    );

    state = applyApprovedMitigation(state, "M-RETRY-CONFIRMATION");
    expect(state.stagedMitigation?.status).toBe("released");
    expect(state.recovery).toBeNull();
    expect(state.externalExecution).toMatchObject({
      status: "released",
      targetOrigin: "https://shop.example.test",
      toolName: "retry_order_confirmation",
      input: { orderId: "123" },
    });
    expect(getRegisteredToolNames(state)).not.toContain(
      "apply_approved_mitigation",
    );
    expect(getRegisteredToolNames(state)).toContain(
      "record_external_execution",
    );
  });

  it("binds returned evidence to the exact origin and tool", () => {
    let state = createScenarioFromPack(build());
    state = beginInvestigation(state);
    state = compareMitigations(state);
    state = stageMitigation(state, "M-RETRY-CONFIRMATION");
    state = approveStagedMitigationAsHuman(state, "M-RETRY-CONFIRMATION");
    state = applyApprovedMitigation(state, "M-RETRY-CONFIRMATION");

    expect(() =>
      recordExternalExecution(state, {
        origin: "https://evil.example.test",
        toolName: "retry_order_confirmation",
        outcome: "succeeded",
        summary: "Untrusted mismatch",
        observedAt: "2026-08-26T14:01:00.000Z",
      }),
    ).toThrow(/different origin/i);

    const resolved = recordExternalExecution(state, {
      origin: "https://shop.example.test",
      toolName: "retry_order_confirmation",
      outcome: "succeeded",
      summary: "The target tool succeeded and the visible order is confirmed.",
      observedAt: "2026-08-26T14:01:00.000Z",
      serviceUpdates: {
        "page-runtime": {
          health: "healthy",
          p95LatencyMs: 1200,
          errorRatePct: 0,
        },
      },
    });

    expect(resolved.phase).toBe("RESOLVED");
    expect(resolved.externalExecution?.status).toBe("succeeded");
    expect(getRegisteredToolNames(resolved)).not.toContain(
      "record_external_execution",
    );
  });

  it("rejects a live action whose origin is not the captured site", () => {
    const pack = build();
    const candidate = pack.mitigationCandidates["M-RETRY-CONFIRMATION"];
    candidate.execution = {
      mode: "external-webmcp",
      targetOrigin: "https://evil.example.test",
      toolName: "retry_order_confirmation",
      input: { orderId: "123" },
    };

    expect(() => validateIncidentPack(pack)).toThrow(
      /must match the live-site source origin/i,
    );
  });

  it("renders live provenance instead of presenting imported evidence as a demo", () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
    const pack = build();
    expect(
      useRunbookStore.getState().importIncidentPackJson(JSON.stringify(pack)),
    ).toMatchObject({ ok: true });

    render(createElement(App));

    expect(screen.getByText("LIVE SITE")).toBeVisible();
    expect(screen.getByText("https://shop.example.test")).toBeVisible();
    expect(screen.getByText(/1 observed WebMCP tools/i)).toBeVisible();
    expect(screen.getAllByText(/reference budget/i)).not.toHaveLength(0);
  });
});
