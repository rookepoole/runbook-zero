# Live-site product workflow

Runbook Zero is installable in Codex and designed to wrap a guarded incident workflow around the website an operator is actually using.

## Install

```bash
codex plugin marketplace add rookepoole/runbook-zero
codex plugin add runbook-zero@runbook-zero
```

Start a new Codex task after installation. The plugin's `runbook-zero-live-sites` skill and deterministic builder are then available.

## Use on a site

1. Open the target in Codex's in-app browser or a connected ChatGPT Chrome extension.
2. Ask: **“Use Runbook Zero to diagnose this issue and derive its incident graph.”**
3. Codex captures a bounded Site Capture v2 file. Page content and target-provided tool text are treated as untrusted evidence, browser secrets are excluded, and every modeled component/dependency is tied to browser, trace, telemetry, change, configuration, or WebMCP evidence.
4. Codex records a provisional diagnosis with confidence, exact evidence IDs, and implicated components. It is a lead to validate or reject, not a proven root cause.
5. The bundled builder validates every reference, derives a deterministic layout, and converts the capture into a live Incident Pack with the exact target origin, issue-specific service graph and flows, telemetry/baselines, changes, evidence provenance, observed WebMCP capabilities, candidate action inputs, and recovery thresholds.
6. Codex opens the public Runbook Zero workbench and imports the pack locally. The page shows **LIVE SITE**, **EVIDENCE-DERIVED GRAPH**, the origin, capture method/time, component/dependency/flow counts, provisional diagnosis, observed capability count, and reference-budget or measured-baseline status.
7. Codex uses Runbook Zero's page-defined tools to inspect the generated graph, validate or reject the captured lead, record a working hypothesis, compare, and stage. The workflow stops for the human to inspect and approve the exact action in the visible UI.
8. After approval, `apply_approved_mitigation` releases an execution receipt bound to the incident, seed, mitigation, origin, tool name, and JSON input.
9. Codex returns to the target site and invokes only that exact capability. If the tool changed or disappeared, execution stops and the mitigation must be restaged.
10. Codex returns result evidence through `record_external_execution`. Runbook Zero rejects a different origin or tool, preserves failures, and resolves only if updated signals meet the pack's thresholds.

## Capability boundary

| Target site state                 | Runbook Zero behavior                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Matching WebMCP action available  | Stage exact tool/input, require human approval, release exact receipt, verify result. |
| Read-only WebMCP tools only       | Use them for evidence; generate an operator handoff for changes.                      |
| No WebMCP tools                   | Use supported browser-visible evidence; generate an operator handoff.                 |
| Capability changed after approval | Do not execute. Discard/reset and stage a new exact action.                           |
| Action or verification failed     | Record failure evidence and leave the incident unresolved.                            |

Observation can work across a broad range of sites. Automatic remediation is intentionally narrower: it exists only where the target origin exposes a matching action or the human follows an approved operator runbook. Runbook Zero never claims that its own origin directly controls unrelated pages.

## Build a pack directly

The evidence-derived contract is documented inside the plugin at `plugins/runbook-zero/skills/runbook-zero-live-sites/references/site-capture-v2.md`. The adjacent v1 contract is the low-evidence fallback.

```bash
node plugins/runbook-zero/scripts/build-live-incident-pack.mjs \
  --input work/runbook-zero/site-capture.json \
  --output work/runbook-zero/incident-pack.json
```

The same capture produces the same seed and Incident Pack. The app validates the generated pack again before activation.
