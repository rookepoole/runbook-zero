# Architecture

Runbook Zero is a client-side React application with a thin Cloudflare Worker-compatible entry point for ChatGPT Sites. The incident model, safety rules, WebMCP registry, simulation, and interface all run from the same deterministic state.

```text
Browser agent
    │ real document.modelContext tools
    ▼
Phase-derived WebMCP registry ── aborts stale registrations
    │
    ▼
Pure domain queries + guarded commands
    │
    ▼
Validated Incident Pack ──► Shared Zustand incident state ◄──── visible human approval control
    │                                  (not a WebMCP tool)
    ├──────────────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
Topology     Incident command   Telemetry    Change/timeline
    │
    ▼
Pack-defined deterministic recovery simulation
```

## Incident Pack boundary

An Incident Pack is pure JSON data. It supplies the incident metadata, service graph, normalized topology layout, named request flows, baseline/current telemetry, change and evidence records, mitigation candidates with exact actions, risk and reversibility, resulting configuration, recovery thresholds, and fixed recovery frames.

The validator resolves every cross-reference before activation and rejects malformed, oversized, or unsafe imports without changing the current workspace. Pack content cannot define executable code, add a WebMCP tool, alter the state machine, or create approval authority. See [Incident Pack v1](incident-pack-schema.md).

## State machine

```text
BOOT → HEALTHY → INCIDENT_OPEN → INVESTIGATING → MITIGATION_CANDIDATES
  → MITIGATION_STAGED → AWAITING_HUMAN_APPROVAL → APPROVED
  → MITIGATING → RESOLVED → POSTMORTEM_READY
```

The only reverse edge in the canonical workflow is discard:

```text
AWAITING_HUMAN_APPROVAL → INVESTIGATING
```

Every other transition is explicit and guarded. Invalid transitions throw domain errors instead of silently changing state.

## Approval invariant

The safety boundary is enforced in three places:

1. **Domain command:** approval binds the incident ID, mitigation ID, scenario seed, and staged timestamp. Apply rejects absent, invalidated, or mismatched approval.
2. **Dynamic registry:** `apply_approved_mitigation` is registered only when the phase is `APPROVED` **and** the staged mitigation carries `status: "approved"`; it is removed when apply transitions to `MITIGATING`.
3. **Human interface:** the only approval action is the visible **Approve staged mitigation** control. No tool can approve on the human's behalf.

Staging and approval both preserve production configuration and telemetry. Mutation begins only when the exact approved mitigation is applied.

## Deterministic simulation

Each pack resets to its own fixed seed, topology, service health, telemetry, change record, candidates, timestamps, and recovery frames. The canonical pack always opens `INC-042`; `M-POOL-RESTORE` still repairs the pool through five fixed one-second frames. The payment and catalog packs follow the same commands and engine with their own fixed evidence and thresholds. No random jitter or external service is involved.

This makes reset, testing, judging, and video recording reproducible while keeping the WebMCP interactions real.

## Shared operational workspace

The interface follows three information depths without moving the operator away from the incident room:

- Depth 0 keeps impact path, unhealthy count, worst P95/error rate, phase, and authority state continuously visible.
- The Capability Firewall keeps the actual active tool names, locked consequential capability, phase, and human authority state continuously visible.
- Depth 1 combines the dependency graph, selected-service telemetry, incident command, and evidence trail.
- Depth 2 exposes baseline deltas, deterministic trends, dependency direction, exact change records, evidence IDs, mitigation assumptions, and approval scope.

Human node selection and WebMCP tool calls use the same shared focus state. Contextual Focus Mode enlarges the relevant region while keeping the other three regions compressed and available; `Escape` returns to the four-region layout. Provenance remains explicit: agent focus is blue, human approval is violet, and system events are neutral.

## Deployment boundary

The Worker in `worker/index.ts` serves the Vite client bundle through the Sites-managed asset binding. It contains no incident logic, credentials, persistence, or approval behavior. The deployed application therefore exercises the same domain, registry, and UI code validated locally.

## Verification layers

- Pure state-machine, query, command, pack-validation, safety, registry, and simulation tests.
- React workspace and recovery UI tests.
- Playwright canonical and multi-pack journeys, keyboard, reduced-motion, viewport, overflow, import-failure, and console checks.
- Real supported-browser WebMCP discovery and invocation on local and deployed version 6 across all three bundled packs, including the canonical approval-and-recovery transition.
- Anonymous HTTPS and direct-link deployment checks.

Evidence and claim boundaries are recorded in [judging-evidence.md](judging-evidence.md).
