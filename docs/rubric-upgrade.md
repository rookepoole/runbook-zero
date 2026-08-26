# Official-rubric product assessment

Date: 2026-08-26

Scope: deployed public version 7 compared with the former version 6 baseline.

These are evidence-based internal estimates, not predictions of an individual judge's score.

| Official criterion    | v6 estimate | deployed v7 | Evidence for the change                                                                                                                                                                                                                                                    |
| --------------------- | ----------: | ----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebMCP Leverage       |      8.5/10 |  **9.2/10** | The dynamic page registry and visible capability firewall now govern both deterministic packs and external site actions. A released live action exposes a receipt-bound evidence tool while apply disappears; origin/tool mismatches are rejected independently of schema. |
| Execution             |      7.0/10 |  **8.7/10** | Runbook Zero is now a real Codex plugin installable from its repository marketplace. It includes a capture contract, deterministic builder, live provenance UI, external-action receipts, fallback handoffs, 65 unit/component tests, and 4 browser tests.                 |
| Potential Impact      |      5.5/10 |  **8.4/10** | The product can now wrap investigation and guarded action around a broad range of browser-visible sites. Automation expands when a target exposes WebMCP while no-tool sites still receive evidence-backed diagnosis and exact operator handoff.                           |
| Creativity & Ambition |      7.5/10 |  **9.1/10** | The approval firewall now crosses origins without pretending origin isolation does not exist: Codex carries bounded evidence into the workbench and carries only an exact human-approved receipt back to the target.                                                       |

Estimated total: **35.4/40**, up from **28.5/40** at the start of the product reset.

## Meaningful product improvements

- **IMPLEMENTED:** repository marketplace, installable Codex plugin `0.7.0`, triggerable live-site skill, Site Capture v1 contract, and deterministic builder.
- **IMPLEMENTED:** live-site origin, URL, title, capture method/time, observed WebMCP tools, and reference-budget provenance in the visible workbench.
- **IMPLEMENTED:** `external-webmcp` and `operator-handoff` execution modes using the existing incident domain and human approval boundary.
- **IMPLEMENTED:** exact execution receipts bound to incident, seed, mitigation, origin, tool, and input.
- **IMPLEMENTED:** dynamic `record_external_execution` registration after release; origin/tool mismatch rejection; failed actions remain unresolved; successful actions still require passing thresholds.
- **TESTED:** plugin manifest validation; successful Codex installation from the public GitHub marketplace at commit `ff32a1f`; deterministic WebMCP and no-WebMCP pack generation; 17 Vitest files / 65 tests; 4 Playwright tests; clean typecheck, lint, and build.
- **PRESERVED:** the full deterministic `INC-042` reset-to-resolution browser journey and pre-approval apply absence.

## Evidence boundary

- The Playwright browser harness exercises the production registry and executors but is not real Chrome-extension WebMCP evidence.
- **TESTED:** a real connected Chrome extension rendered production version 7 with zero recorded console errors and captured `https://webmcp.devpost.com/` as a second public origin. The target exposed no `document.modelContext`, so the capture deterministically produced the honest operator-handoff path.
- **TESTED:** after enabling Chrome 151's WebMCP testing runtime, the official Chrome Labs explainer registered three page tools and visibly executed its built-in `bookSlot` call. Deployed Runbook Zero simultaneously reported **WebMCP Connected**, nine active tools, locked apply, and zero console errors.
- The Chrome result proves cross-site capture, safe degradation, native tool registration, the correct pre-approval Runbook surface, and a visible primary-source demo execution. It does not relabel the demo's built-in agent as a Codex-to-Runbook invocation; that requires a fresh task with the installed plugin and attached Chrome tab.
- **DEPLOYED:** Sites version 7 deployment `appgdep_6a8ea7ffdd448191be481afad4616398` succeeded from exact pushed commit `a70b024524b3e7d5015167917e30405de5b1631b`.
- Fresh-viewer acceptance, the public sub-three-minute video, Devpost confirmation, final SHA/tag, and immutable submission freeze remain outstanding.
