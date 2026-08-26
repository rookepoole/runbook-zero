# ADR-003: Make the Challenge artifact an installable live-site product

Status: Accepted for version 7

Date: 2026-08-26

## Evidence

The official WebMCP Challenge rubric rewards a complete, coherent product, real-world impact, deep WebMCP leverage, and ambition. Public version 6 has a strong page-defined WebMCP control plane, but all three bundled incidents and imported Incident Packs ultimately apply deterministic in-memory recovery frames. It cannot yet take evidence from the website an operator is actually using or carry an approved action back to that origin. That makes the experience read as a polished simulator.

WebMCP tools are origin-scoped. Runbook Zero's deployed page cannot truthfully claim to inspect or control arbitrary unrelated origins by itself. Codex and the ChatGPT browser extension can operate on the user-selected browser surface, so the product boundary must span two explicit surfaces: the target site for observation/execution and Runbook Zero for diagnosis, staging, approval, and auditing.

The owner explicitly superseded the prior Challenge-versus-commercial sequencing rule and directed that the hackathon artifact become the product rather than postpone real-site usefulness.

## Impact

Runbook Zero version 7 adds:

- a repository-hosted Codex plugin and marketplace manifest;
- a bounded Site Capture v1 contract and deterministic live Incident Pack builder;
- live-site source provenance, observed WebMCP capabilities, and honest reference-budget labeling in the workbench;
- external WebMCP and operator-handoff execution modes;
- an approval-bound execution receipt that carries the exact target origin, tool name, and JSON input;
- a post-action evidence tool that binds results to the exact receipt and only resolves the incident when recovery thresholds pass.

This is product infrastructure inside the public AGPL artifact. It does not require authentication, billing, a hosted data plane, credentials, or a universal remediation backend. Those remain evidence-driven future choices rather than artificial prerequisites.

## Smallest replacement

Keep the existing Incident Pack, state machine, shared UI/domain commands, dynamic registry, deterministic bundled simulations, and human-only approval control. Extend the pack with optional source provenance and execution metadata. For bundled packs, apply continues to run deterministic recovery frames. For a live-site pack, apply releases an exact receipt; Codex then invokes the matching capability on the captured origin and synchronizes the result back into Runbook Zero.

The claim boundary is explicit:

- observation works on a broad range of browser-visible sites;
- automated action requires a matching target-site capability;
- sites without that capability receive an operator handoff;
- Runbook Zero never claims that its own origin directly changed an unrelated site.

## Preserved hard invariants

1. There is no WebMCP approval tool.
2. If `stagedMitigation.status !== "approved"`, `apply_approved_mitigation` is not registered.
3. Approval remains bound to the exact incident, seed, mitigation, origin, tool name, and input.
4. Staging never changes the target site.
5. `INC-042` remains deterministic and reproducible.
6. Private planning, design, continuation, and commercial-strategy documents remain outside the public repository.

## Regression gates

Rerun:

1. plugin manifest validation and clean installation from the repository marketplace;
2. Site Capture builder tests for WebMCP, no-WebMCP, invalid origin/tool, deterministic output, and hostile inputs;
3. domain and registry tests proving pre-approval apply absence, exact receipt binding, dynamic post-release evidence registration, and threshold-based resolution;
4. all existing typecheck, format, lint, unit, build, dependency, and browser tests;
5. the canonical `INC-042` reset-to-resolution browser journey;
6. a real browser-extension live-site flow on more than one origin, including a no-WebMCP negative case;
7. deployed-origin WebMCP discovery and approval-bound execution evidence before publishing version 7.
