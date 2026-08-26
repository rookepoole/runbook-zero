# Submission copy

Version 6 draft for the WebMCP Challenge submission. The application is published and production-revalidated; replace only the final video URL after recording and complete the final submission freeze.

## Title

Runbook Zero

## Tagline

Human-authorized incident response on a shared WebMCP surface.

## Short description

Runbook Zero is a WebMCP-native incident platform where a browser agent and a human investigate failures, compare mitigations, stage exact changes, preserve a visible human-only approval boundary, apply only what was approved, and verify deterministic recovery in the same live interface.

## Inspiration

Operations consoles contain the context needed to resolve incidents, but agents usually see them as pixels or disconnected APIs. That creates two bad choices: make the agent guess at a dense interface, or give it broad automation that leaves the human behind. Runbook Zero explores a third model: the page itself exposes a precise, state-aware operational contract through WebMCP while remaining the shared workspace for the operator.

## What it does

Runbook Zero loads validated Incident Packs through a user-facing launcher. The Challenge Edition includes three complete incidents: the canonical checkout database-pool regression, a payment event queue backlog caused by reduced consumer concurrency, and a catalog cache stampede caused by a TTL regression. Operators can also download a working pack as JSON, customize it, and import it locally without uploading the file.

The canonical `INC-042` scenario begins with checkout latency at 4.7 seconds after an inventory deployment reduced the database pool from 80 to 12. The agent uses page-defined tools to trace the request path, inspect telemetry and configuration, connect the recent change to 97% database saturation, compare mitigations under a no-rollback constraint, and stage a low-risk pool restoration.

The application then stops. The agent has no approval tool and `apply_approved_mitigation` is absent from its WebMCP surface. A human reviews the exact `12 → 80` change and approves it in the visible UI. Only then does the page register apply. After application, the tool disappears immediately, the incident recovers through five deterministic frames, verification passes, and the agent records the resolution in the shared timeline.

## How it uses WebMCP

WebMCP is the application's control plane, not an add-on. Runbook Zero registers 12 real `document.modelContext` tools and derives the active subset from 11 state-machine phases. Stale registrations are aborted on phase or pack changes. The same contracts run every incident while their service, flow, mitigation, and exact approved-action schemas derive from the active pack. Tool calls focus and update the same connected topology, baseline-and-trend telemetry, exact change evidence, mitigation card, provenance timeline, and Capability Firewall the human sees. The tool surface itself communicates authority: stage and discard exist before approval; apply exists only for an exactly approved stage; verify and notes remain during recovery.

## How it was built

- React 19, TypeScript, Vite, and Zustand
- Real page-defined WebMCP through `document.modelContext.registerTool`
- Pure guarded domain commands and queries
- Validated Incident Pack v1 domain with three bundled scenarios and safe local JSON import
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
- Dynamic 5/9/10/10/7 phase-dependent tool surfaces
- Visible Capability Firewall synchronized with the live registry and authority state
- Visible, exact, human-only approval boundary
- Deterministic recovery and one-click reset
- Public ChatGPT Sites deployment and AGPL-3.0 repository
- 57 unit/component tests, 3 browser tests, clean typecheck/lint/build, and real local multi-pack WebMCP evidence

## What we learned

WebMCP is most powerful when capability discovery is also policy. A browser agent does not need every possible action all the time; the page can expose only the actions that are valid, safe, and intelligible in the current human-visible state. That turns the interface into a shared protocol instead of a picture the agent must interpret.

## What's next

After the judged Challenge Edition is frozen, future work can add carefully designed adapters for real observability and remediation systems without weakening the same stage → human approval → exact apply → verification boundary. No commercial backend or production integration is part of this Challenge candidate.

## Testing instructions

No account or credentials are required. Open the live app in ChatGPT's in-app browser or Chrome 149+ with WebMCP testing enabled, select **Reset Scenario**, and follow the five-step canonical flow in the repository README. Before clicking the visible human approval button, confirm the page shows `STAGED — NOT APPLIED`, 10 active tools, and no `apply_approved_mitigation`. After clicking approval, apply becomes available for the exact staged mitigation. The deterministic flow ends at `RESOLVED` and can be repeated from reset.

## Links

- Live app: <https://runbook-zero.rookepoole.chatgpt.site>
- Source: <https://github.com/rookepoole/runbook-zero>
- Judging evidence: <https://github.com/rookepoole/runbook-zero/blob/main/docs/judging-evidence.md>
- Demo video: **replace with final public video URL**

## Suggested tags

`webmcp` · `incident-response` · `human-in-the-loop` · `devtools` · `sre` · `react` · `typescript`
