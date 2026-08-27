# ADR-004: Evidence-derived live incidents

Status: accepted

Date: 2026-08-27

## Evidence

Version 7 made Runbook Zero installable and origin-safe, but every new browser capture was reduced to the same `page-runtime → browser-network` topology. The symptom, evidence, and action could vary while the operational model stayed fixed. Real product use therefore still looked like replaying a generic walkthrough instead of diagnosing the issue in front of the operator.

## Impact

Site Capture v2 accepts 2–24 evidence-backed components, dependency edges, named user flows, current and baseline telemetry, relevant changes, a provisional diagnosis, candidate targets, and optional recovery thresholds. The deterministic builder validates all IDs and references, rejects flow hops without an evidenced edge, derives a stable layout, and emits the existing Incident Pack v1 domain. Live-source metadata lets the shared UI show component labels/kinds, graph provenance, counts, and the captured diagnosis as an explicitly unvalidated lead.

The same domain commands and WebMCP contracts operate on every generated pack. Tool schemas and results derive from the active services, flows, evidence, and candidates. Site Capture v1 remains backward compatible as a conservative two-surface fallback when the evidence cannot support a richer graph.

## Smallest replacement

No state-machine, approval, execution-receipt, Incident Pack, or WebMCP contract was replaced. The change is limited to the capture input/builder, optional live-source metadata, labels/provenance in shared presentation components, plugin instructions, and regression evidence.

The captured diagnosis does not become a working hypothesis automatically. It remains **CAPTURED LEAD · NOT YET VALIDATED** until an agent uses the existing `set_working_hypothesis` contract.

## Regression gates

1. Existing Site Capture v1 packs build deterministically and pass validation.
2. Two unrelated v2 captures produce different services, topology, flows, diagnoses, candidates, and deterministic layouts through the same domain.
3. Duplicate IDs, unknown component/evidence references, unevidenced flow edges, malformed telemetry, false measured-baseline claims, and unobserved action tools fail closed.
4. Dynamic WebMCP service/flow/mitigation schemas and results match the generated graph.
5. `apply_approved_mitigation` remains absent until the exact staged object has visible human approval.
6. Canonical `INC-042`, multi-pack, live receipt, keyboard, viewport, reduced-motion, and build regressions remain green.
