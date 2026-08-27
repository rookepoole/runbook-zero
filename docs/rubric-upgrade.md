# Official-rubric product assessment

Date: 2026-08-27

Scope: locally validated version 8 candidate compared with deployed public version 7. Deployment status is tracked separately from implementation evidence.

These are evidence-based internal estimates, not predictions of an individual judge's score.

| Official criterion    | deployed v7 | v8 candidate | Evidence for the change                                                                                                                                                                                                                                                                   |
| --------------------- | ----------: | -----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebMCP Leverage       |      9.2/10 |   **9.5/10** | The same dynamic contracts now bind to every generated service and flow enum. Real local `document.modelContext` calls returned a newly derived checkout graph, while the visible firewall still withheld apply until exact approval.                                                     |
| Execution             |      8.7/10 |   **9.2/10** | Plugin 0.8.0 includes a validated v2 contract, deterministic graph builder, stable layout, provisional-diagnosis UI, v1 fallback, two unrelated multi-component fixtures, hostile-reference rejection, 69 unit/component tests, 4 browser journeys, clean build, and valid skill package. |
| Potential Impact      |      8.4/10 |   **9.1/10** | New sites no longer collapse into the same browser-runtime diagram. Bounded evidence can generate issue-specific components, dependencies, flows, telemetry, changes, diagnosis, exact actions, or an honest operator handoff across a much wider range of incidents.                     |
| Creativity & Ambition |      9.1/10 |   **9.5/10** | Runbook Zero now turns browser evidence into a provisional operational model and then lets WebMCP interrogate that new model, while preserving origin isolation and the human authority firewall.                                                                                         |

Estimated total: **37.3/40**, up from deployed v7's **35.4/40**. These remain internal estimates, not promises about judging.

## Meaningful product improvements

- **IMPLEMENTED:** repository marketplace, installable Codex plugin `0.8.0`, triggerable live-site skill, evidence-derived Site Capture v2 contract, deterministic graph builder, and conservative v1 fallback.
- **IMPLEMENTED:** issue-specific components, dependencies, flows, telemetry/baselines, changes, stable layouts, provisional diagnosis provenance, candidate targets, and recovery thresholds.
- **IMPLEMENTED:** live-site origin, URL, title, capture method/time, observed WebMCP tools, and reference-budget provenance in the visible workbench.
- **IMPLEMENTED:** `external-webmcp` and `operator-handoff` execution modes using the existing incident domain and human approval boundary.
- **IMPLEMENTED:** exact execution receipts bound to incident, seed, mitigation, origin, tool, and input.
- **IMPLEMENTED:** dynamic `record_external_execution` registration after release; origin/tool mismatch rejection; failed actions remain unresolved; successful actions still require passing thresholds.
- **TESTED:** plugin manifest and skill validation; two unrelated captures produce materially different deterministic graphs and tool results; invalid references and unobserved tools fail closed; 17 Vitest files / 69 tests; 4 Playwright tests; clean typecheck, format, lint, and build.
- **TESTED:** the local Codex in-app browser discovered the generated five-service/one-flow WebMCP schema, called `get_system_snapshot` and `trace_request_path` through real `document.modelContext`, returned incident-specific results, updated the same topology UI, and recorded zero console errors.
- **PLANNED:** publish and production-revalidate version 8. Until that receipt exists, version 7 remains the deployed public baseline.
- **PRESERVED:** the full deterministic `INC-042` reset-to-resolution browser journey and pre-approval apply absence.

## Evidence boundary

- The Playwright browser harness exercises the production registry and executors but is not real Chrome-extension WebMCP evidence.
- **TESTED:** a real connected Chrome extension rendered production version 7 with zero recorded console errors and captured `https://webmcp.devpost.com/` as a second public origin. The target exposed no `document.modelContext`, so the capture deterministically produced the honest operator-handoff path.
- **TESTED:** after enabling Chrome 151's WebMCP testing runtime, the official Chrome Labs explainer registered three page tools and visibly executed its built-in `bookSlot` call. Deployed Runbook Zero simultaneously reported **WebMCP Connected**, nine active tools, locked apply, and zero console errors.
- The Chrome result proves cross-site capture, safe degradation, native tool registration, the correct pre-approval Runbook surface, and a visible primary-source demo execution. It does not relabel the demo's built-in agent as a Codex-to-Runbook invocation; that requires a fresh task with the installed plugin and attached Chrome tab.
- **DEPLOYED:** Sites version 7 deployment `appgdep_6a8ea7ffdd448191be481afad4616398` succeeded from exact pushed commit `a70b024524b3e7d5015167917e30405de5b1631b`.
- Fresh-viewer acceptance, the public sub-three-minute video, Devpost confirmation, final SHA/tag, and immutable submission freeze remain outstanding.
