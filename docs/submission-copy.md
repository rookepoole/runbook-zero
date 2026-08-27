# Submission copy

Version 8 public-candidate copy for the WebMCP Challenge submission. Production revalidation is recorded; replace the final video URL and complete the submission freeze.

## Title

Runbook Zero

## Tagline

Human-authorized incident response for the site open in Codex.

## Short description

Runbook Zero is an installable WebMCP incident product. Codex captures evidence from the site an operator is using; the Runbook Zero workbench investigates, stages, and visibly approves an exact action; Codex executes only that approval-bound action on the target origin and synchronizes verification evidence back into the shared interface.

## Inspiration

Operations consoles contain the context needed to resolve incidents, but agents usually see them as pixels or disconnected APIs. That creates two bad choices: make the agent guess at a dense interface, or give it broad automation that leaves the human behind. Runbook Zero explores a third model: the page itself exposes a precise, state-aware operational contract through WebMCP while remaining the shared workspace for the operator.

## What it does

Runbook Zero installs into Codex from the public repository. Its live-site skill diagnoses bounded browser evidence, inventories target-site WebMCP capabilities, and derives issue-specific components, dependency edges, user flows, telemetry, changes, and a provisional evidence-bound diagnosis. The deterministic builder turns that model into a locally validated Incident Pack. The workbench visibly identifies the exact URL/origin, capture method, graph provenance, diagnosis confidence/evidence, and available action contract. When the target exposes no applicable WebMCP action, the product produces an operator handoff instead of pretending automation exists.

The deterministic incident lab remains available with three complete packs: the canonical checkout database-pool regression, a payment event queue backlog caused by reduced consumer concurrency, and a catalog cache stampede caused by a TTL regression. These keep the exact judging flow reproducible while the same domain now handles real-site packs.

The canonical `INC-042` scenario begins with checkout latency at 4.7 seconds after an inventory deployment reduced the database pool from 80 to 12. The agent uses page-defined tools to trace the request path, inspect telemetry and configuration, connect the recent change to 97% database saturation, compare mitigations under a no-rollback constraint, and stage a low-risk pool restoration.

The application then stops. The agent has no approval tool and `apply_approved_mitigation` is absent from its WebMCP surface. A human reviews the exact `12 → 80` change and approves it in the visible UI. Only then does the page register apply. After application, the tool disappears immediately, the incident recovers through five deterministic frames, verification passes, and the agent records the resolution in the shared timeline.

## How it uses WebMCP

WebMCP is the product's control plane, not an add-on. Runbook Zero defines 13 real `document.modelContext` contracts and derives the active subset from phase, authority, active pack, and execution mode. Stale registrations are aborted. Tool calls focus and update the same topology/surfaces, telemetry, evidence, mitigation card, provenance timeline, and Capability Firewall the human sees. Stage and discard exist before approval; apply exists only for an exactly approved stage. A live apply releases a receipt bound to the exact incident, seed, origin, tool, and JSON input; it does not falsely claim the unrelated site changed. After release, only `record_external_execution` can synchronize result evidence, and recovery thresholds still decide resolution.

## How it was built

- React 19, TypeScript, Vite, and Zustand
- Real page-defined WebMCP through `document.modelContext.registerTool`
- Pure guarded domain commands and queries
- Validated Incident Pack v1 domain with three bundled scenarios and safe local JSON import
- Repository-hosted Codex marketplace and installable live-site skill
- Evidence-derived Site Capture v2 contract, deterministic graph/layout builder, and conservative v1 fallback
- Origin-bound external WebMCP receipts and operator-handoff fallback
- Pack-driven deterministic recovery engine with incident-specific thresholds
- Dynamic AbortController-based tool registration
- Three-depth operational information model and shared contextual Focus Mode
- Vitest and Testing Library for domain, registry, safety, and UI coverage
- Playwright for reset-to-resolved browser, keyboard, viewport, reduced-motion, and console checks
- ChatGPT Sites with a thin Cloudflare Worker-compatible asset entry point

## Challenges

The hardest part was preserving human authority as a runtime capability invariant, not merely a disabled button. The implementation binds approval to the exact staged mitigation and removes apply from the browser-agent surface before approval and immediately after use. Another challenge was making agent work legible without a second dashboard; every action needed to update the operator's existing context with explicit Agent, Human, or System provenance.

## Accomplishments

- Complete canonical J1–J4 incident journey through real WebMCP
- One shared tool/domain layer proven across three incident classes
- Direct pre-approval apply attempt demonstrably blocked
- Dynamic 5/9/10/10/7 tool surfaces plus a receipt-only live evidence capability
- Visible Capability Firewall synchronized with the live registry and authority state
- Visible, exact, human-only approval boundary
- Deterministic recovery and one-click reset
- Public ChatGPT Sites deployment and AGPL-3.0 repository
- 69 unit/component tests, 4 browser tests, clean typecheck/format/lint/build, plugin/skill validation, distinct multi-graph live captures, real local generated-graph WebMCP calls, and preserved installed-product/Chrome evidence

## What we learned

WebMCP is most powerful when capability discovery is also policy. A browser agent does not need every possible action all the time; the page can expose only the actions that are valid, safe, and intelligible in the current human-visible state. That turns the interface into a shared protocol instead of a picture the agent must interpret.

## What's next

The next product step is to validate the installed skill across additional real origins, package more capture adapters, and add production integrations only where their permissions can preserve the same stage → visible human approval → exact origin-bound action → verification boundary.

## Testing instructions

No account or credentials are required for the public workbench. Install the Codex plugin using the two README commands, start a new task, open a target site in Codex or a connected ChatGPT Chrome extension, and ask **“Use Runbook Zero to investigate this site.”** For deterministic judging, reset `INC-042` and follow the five-step canonical flow. Before visible approval, confirm no `apply_approved_mitigation` exists; after approval, apply is available only for the exact stage.

## Links

- Live app: <https://runbook-zero.rookepoole.chatgpt.site>
- Source: <https://github.com/rookepoole/runbook-zero>
- Judging evidence: <https://github.com/rookepoole/runbook-zero/blob/main/docs/judging-evidence.md>
- Demo video: **replace with final public video URL**

## Suggested tags

`webmcp` · `incident-response` · `human-in-the-loop` · `devtools` · `sre` · `react` · `typescript`
