# ADR-002: Generalize scenarios as validated Incident Packs

Status: Accepted and deployed in public Sites version 6

Date: 2026-08-26

## Evidence

The canonical `INC-042` experience was reliable, but service IDs, topology positions, flow names, configuration fields, mitigation copy, and recovery frames were encoded directly in presentation and scenario modules. Against the official judging rubric, this made a strong WebMCP safety demonstration look like a scenario-specific proof of concept and constrained Execution and Potential Impact.

## Impact

Runbook Zero now accepts a pure-data Incident Pack containing incident metadata, topology, service telemetry and baselines, changes, evidence, exact mitigation candidates/actions, risk, reversibility, thresholds, and deterministic recovery frames. `INC-042` remains canonical; payment-queue and catalog-cache packs demonstrate reuse. The launcher also supports locally validated JSON imports.

This changes the frozen single-scenario data boundary. It does not change the state machine, the 12 WebMCP tool names, the shared human/agent workspace, the human-only approval control, or the exact approval binding.

## Smallest replacement

- Replace closed unions and component constants for service, flow, and mitigation IDs with validated pack-provided identifiers.
- Derive initial runtime state from one validated pack.
- Drive queries, tool schemas, configuration evidence, topology layout, exact actions, and recovery frames from that runtime state.
- Preserve `createScenarioA()` as a compatibility wrapper around the canonical pack.
- Keep consequential capability registration gated by both application phase and `stagedMitigation.status === "approved"`.

No backend, authentication, billing, external observability integration, production remediation adapter, or commercial infrastructure is included.

## Regression gates

Rerun:

1. typecheck, format, lint, build, and dependency audit;
2. all state-machine, domain, registry, safety, simulation, and component tests;
3. canonical `INC-042` Playwright reset-to-resolution journey;
4. multi-pack Playwright launcher, dynamic-schema, capability-firewall, approval, invalid-import, and per-pack reset checks;
5. real supported-browser WebMCP discovery and calls before staging, after staging, after visible human approval, and after apply;
6. deployed-origin canonical rehearsal after version 6 publication.
