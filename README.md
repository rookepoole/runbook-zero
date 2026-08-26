# Runbook Zero

**A WebMCP-native incident command environment where humans and browser agents investigate, stage, approve, apply, and verify mitigations on the same live surface.**

[Open the live Challenge Edition](https://runbook-zero.rookepoole.chatgpt.site) · [Judging evidence](docs/judging-evidence.md) · [Demo script](docs/demo-script.md) · [Submission stills](docs/submission-assets.md)

![Runbook Zero staging an exact mitigation for visible human review](docs/screenshots/submission-staged-not-applied.png)

Runbook Zero makes WebMCP part of the product's control plane. The page registers real `document.modelContext` tools, changes that tool surface as the incident moves through its state machine, and renders every agent action into the same topology, telemetry, change record, and incident timeline the human sees.

The central safety invariant is enforced at both the domain and registry layers:

> `apply_approved_mitigation` does not exist on the WebMCP surface until a human visibly approves the exact staged mitigation.

There is no WebMCP approval tool. Staging does not mutate production. Approval does not apply. Apply disappears immediately after use.

## Canonical judging flow

Open the live site in a supported WebMCP client, select **Reset Scenario**, and use these prompts:

1. **Diagnose** — “Checkout latency spiked after this morning's deployment. Find the likely cause. Don't change production yet.”
2. **Stage** — “Don't roll back inventory. Show me the lowest-risk alternative and stage it for review.”
3. **Human approval** — click **Approve staged mitigation** in the visible interface.
4. **Recover** — “Apply the approved mitigation and verify recovery.”
5. **Close** — “Add a note that we restored the inventory DB pool after the v2.7.0 regression.”

The deterministic result is `M-POOL-RESTORE`, restoring `dbPoolSize` from 12 to 80. Recovery finishes through five fixed frames at 420 ms checkout P95, 0.8% checkout errors, and 55% inventory database saturation.

## Why WebMCP is fundamental

- **Real page-defined tools:** 12 non-overlapping tools use `document.modelContext.registerTool`.
- **Dynamic capability surface:** tools are registered from the current application phase and stale registrations are aborted.
- **Shared human/agent workspace:** tool calls focus and update the same interface the operator uses.
- **Human authority:** approval is a visible human UI event, never an agent capability.
- **Exact binding:** application is valid only for the mitigation ID that the human approved.
- **Deterministic judging:** `INC-042` resets to the same incident, evidence, candidates, timeline, and recovery every time.

See [Architecture](docs/architecture.md) for the state machine and [WebMCP tools](docs/webmcp-tools.md) for the complete lifecycle table.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

Open the printed local URL in a WebMCP-capable browser client. The human interface still works in a conventional browser, but browser-agent discovery requires WebMCP support.

## Validate

```bash
npm run typecheck
npm run format:check
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

The Playwright suite uses a test-only `document.modelContext` harness against the production registry and executors. It validates the browser workflow but does not replace the real supported-browser evidence recorded in [Judging evidence](docs/judging-evidence.md).

Current validated baseline: 12 Vitest files / 42 tests, 2 Playwright Chromium tests, production build, and zero npm audit findings.

## Repository map

```text
src/domain/       pure state machine, commands, queries, validation
src/simulation/   deterministic INC-042 scenario and recovery frames
src/state/        shared Zustand application state
src/webmcp/       capability detection, tool contracts, dynamic registry
src/components/   shared operator/agent workspace
tests/unit/       domain, registry, safety, simulation, and UI tests
tests/browser/    canonical reset-to-resolved browser journey
docs/evidence/    bounded gate receipts
worker/           thin ChatGPT Sites asset-serving entry point
```

## Challenge Edition

This public repository is the Runbook Zero Challenge Edition, created for the 2026 WebMCP Challenge. It contains the judged application, tests, reproducibility instructions, and evidence—not private planning, design research, continuation notes, credentials, or commercial infrastructure.

Runbook Zero Challenge Edition is licensed under the [GNU Affero General Public License v3.0](LICENSE). Copyright © 2026 Rooke Poole.
