# Devpost submission copy

Paste-ready project details for the WebMCP Challenge. The title and elevator pitch counts include spaces and punctuation.

## Project title — 50 / 60 characters

Runbook Zero: Incident Command for the Agentic Web

## Elevator pitch — 151 / 200 characters

Runbook Zero turns any WebMCP site into a shared incident workspace where agents diagnose and stage exact actions while humans keep approval authority.

## About the project

```markdown
## Inspiration

Incident response still forces humans to translate between dashboards, browser consoles, agents, runbooks, and change controls while an outage is unfolding. An agent can investigate quickly, but giving it broad action authority makes the human approval step vague or performative. We wanted the browser itself to expose a precise operational contract: enough authority for an agent to gather evidence and stage an exact response, but no authority to approve its own consequential action.

Runbook Zero is our answer. It treats WebMCP as a state-aware incident control plane and keeps the product interface as the shared source of truth for both the operator and the agent.

## What it does

Runbook Zero is an installable incident product for the website an operator is actually using.

- The Codex plugin begins read-only, inspects bounded evidence from the selected site, inventories its WebMCP capabilities, and derives an issue-specific component, dependency, user-flow, telemetry, change, and evidence graph.
- The generated Incident Pack opens in the Runbook Zero workbench, where real `document.modelContext` tools let an agent inspect services, trace paths, query signals, record a hypothesis, compare mitigations, and stage one exact action.
- Every tool call updates and focuses the same topology, telemetry, evidence, mitigation, provenance, and capability interface the human sees.
- The visible Capability Firewall shows active agent capabilities, unavailable consequential capabilities, application phase, and authority state.
- `apply_approved_mitigation` is not registered before approval. The agent has no approval tool. A human must review the exact target, diff, risk, reversibility, assumptions, incident, and seed, then click the visible approval control.
- Only after that click does apply appear, narrowed to the exact approved mitigation. It disappears immediately after use.
- For a live target, Runbook Zero releases an origin-, tool-, and input-bound receipt that Codex carries back to the target site. If no matching action exists, it produces an honest operator handoff instead of pretending automation happened.

The product also includes three polished deterministic packs—checkout pool regression (`INC-042`), payment queue backlog (`INC-117`), and catalog cache stampede (`INC-203`)—plus safe local JSON import. They all run through the same domain and WebMCP contracts. The canonical pack makes the judging flow reproducible; the installed plugin proves Runbook Zero is not limited to a premade walkthrough.

## How we built it

The workbench uses React 19, TypeScript, Vite, Zustand, a guarded state machine, and a validated Incident Pack v1 schema. Thirteen page-defined WebMCP contracts are registered with `document.modelContext.registerTool`. The active subset is derived from incident phase, the current pack, approval state, and execution mode; stale registrations are cancelled with `AbortController` whenever that state changes.

The repository-hosted Codex plugin defines a conservative Site Capture v2 contract. It treats page text, tool descriptions, and tool results as untrusted evidence, rejects browser secrets and invalid cross-references, and deterministically builds a graph and provisional diagnosis from the evidence actually observed. Live action receipts bind the incident, seed, origin, target tool, and exact JSON input. Post-action evidence must still satisfy the pack's recovery thresholds before an incident can resolve.

We validate the product with 17 Vitest files / 69 tests covering domain commands, state transitions, pack validation, dynamic registration, stale tools, the approval invariant, imported-pack failures, deterministic reset, and UI behavior. Four Playwright regression journeys cover reset-to-resolved, multi-pack behavior, keyboard and viewport usability, and live-site receipts. Real local, deployed in-app-browser, installed-plugin, and Chrome WebMCP evidence is recorded separately from the test-only browser harness. The public AGPL-3.0 app is deployed on ChatGPT Sites.

## Challenges we ran into

The hardest challenge was making human authority a runtime property, not a disabled button. Rejecting an early apply call was not enough: the consequential tool had to be completely absent from discovery until the exact staged object had visible human approval, and old handles had to become stale as soon as state changed.

The second challenge was cross-origin honesty. Runbook Zero cannot claim that its page silently changed an unrelated website. We separated approval-bound release from target-site execution and verification, with an operator-handoff fallback when the site exposes no applicable action.

The third challenge was escaping a scenario-specific demo without sacrificing a deterministic judging path. Generalizing the schema, UI, tool inputs, graph layout, thresholds, and recovery engine let bundled and newly captured incidents use the same product while keeping `INC-042` reliable enough for a sub-three-minute demonstration.

## Accomplishments that we're proud of

- WebMCP is the product's control plane, not a decorative integration.
- The same thirteen tool contracts operate against bundled, imported, and evidence-derived live-site incidents.
- The agent and human share one synchronized operational interface with explicit Agent, Human, System, and Change provenance.
- Pre-approval application is impossible through the registered WebMCP surface; approval itself is human-only.
- The Capability Firewall makes the transition from locked apply to exact approved apply visually obvious.
- New issues produce new evidence-derived graphs instead of replaying a fixed demo.
- Live actions use exact origin/tool/input receipts and an honest handoff fallback.
- The canonical workflow resets deterministically and resolves through fixed recovery frames.
- The public app, source, AGPL-3.0 license, installable Codex plugin, tests, and judging evidence are reproducible from the repository.

## What we learned

WebMCP capability discovery can also be policy. The safest consequential tool is not one that merely promises to reject unsafe input; it is a tool that does not exist until the surrounding human-visible state makes its use valid.

We also learned that agent legibility matters as much as agent capability. When tool calls update the interface already in front of the operator, the human can see what the agent inspected, why it formed a hypothesis, what exact change it staged, and which authority boundary remains. Finally, evidence-derived topology is a far stronger bridge from demo to product than a library of hardcoded incident scripts.

## What's next for Runbook Zero

Next we will validate more real sites, add capture adapters for richer browser and observability evidence, and expand the portable policy and receipt model. Production integrations will follow only where they can preserve the same boundary: read-only observation, evidence-backed diagnosis, exact staging, visible human approval, origin-bound execution, independent verification, and auditable closure.
```

## Tags — 25 / 25

1. WebMCP
2. AI Agents
3. Agentic Web
4. Incident Response
5. Incident Management
6. Site Reliability Engineering
7. SRE
8. DevOps
9. Human-in-the-Loop
10. AI Safety
11. Trust and Safety
12. Observability
13. Browser Automation
14. Developer Tools
15. Workflow Automation
16. Change Management
17. Explainable AI
18. Infrastructure
19. Codex
20. ChatGPT
21. Chrome Extension
22. React
23. TypeScript
24. Open Source
25. AGPL-3.0

## Testing instructions for judges

### Fastest path: public app in the ChatGPT in-app browser

No account, credentials, or production access is required.

1. Open <https://runbook-zero.rookepoole.chatgpt.site/> in the ChatGPT/Codex in-app browser.
2. Click **Reset Scenario**. Confirm the header shows `INC-042`, **WebMCP Connected**, and `9 tools active`.
3. In the agent chat, ask: **“Checkout latency spiked after this morning's deployment. Find the likely cause. Don't change production yet.”**
4. Confirm the agent's calls focus and update the visible graph, telemetry, working hypothesis, and evidence trail.
5. Ask: **“Don't roll back inventory. Show me the lowest-risk alternative and stage it for review.”**
6. Confirm the UI shows **STAGED — NOT APPLIED**, the exact `dbPoolSize 12 → 80` change, and `apply_approved_mitigation` as **LOCKED** and absent from the active capability list.
7. The judge—not the agent—clicks **Approve staged mitigation** in the visible UI.
8. Confirm the Capability Firewall turns green and `apply_approved_mitigation` appears as **AVAILABLE**, narrowed to `M-POOL-RESTORE`.
9. Ask: **“Apply the approved mitigation, verify recovery, and add a resolution note.”**
10. Confirm apply disappears immediately, five deterministic recovery frames complete, thresholds pass, the incident becomes **RESOLVED**, and the note appears with Agent provenance.
11. Click **Reset Scenario** once more and confirm `INC-042` returns to the same initial values.

### Installed product path: diagnose a new site with Codex

Run these commands in a terminal with Codex installed:

```bash
codex plugin marketplace add rookepoole/runbook-zero
codex plugin add runbook-zero@runbook-zero
```

Start a **new Codex task** so the installed v0.8.0 skill is loaded. Open the site to investigate in Codex's in-app browser or a connected ChatGPT Chrome extension, then ask:

> Use Runbook Zero to diagnose this issue and derive its incident graph. Begin read-only; do not stage or execute until the evidence is sufficient.

Codex will create a local Site Capture v2 and Incident Pack JSON. Open the public Runbook Zero app, select **Incident Packs → Import JSON**, and choose that generated pack. Confirm **LIVE SITE**, the exact origin, **EVIDENCE-DERIVED GRAPH**, provisional diagnosis, observed capability count, and a graph that reflects the captured site rather than `INC-042`. Continue diagnosis and staging with the same tool names. The judge must perform the visible approval click. If the target has no applicable WebMCP action, the expected safe result is an operator handoff.

### Chrome alternative

Use a WebMCP-enabled Chrome build with the ChatGPT Chrome extension connected. If required by the browser build, enable `chrome://flags/#enable-webmcp-testing` and restart Chrome. Open the live app, confirm **WebMCP Connected**, and follow the deterministic steps above.

### Reproduce from source

Requirements: Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/rookepoole/runbook-zero.git
cd runbook-zero
npm ci
npm run typecheck
npm run format:check
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The Playwright suite uses an isolated test-only `document.modelContext` harness against the production registry and executors. It is regression evidence, not a substitute for the real supported-browser checks above.

## Which agent(s) or client(s) did you test your WebMCP tools with?

- **OpenAI Codex desktop agent (GPT-5.6 Sol)** with the ChatGPT/Codex in-app browser and the installed Runbook Zero plugin v0.8.0.
- **Google Chrome 151.0.7922.174** with WebMCP testing enabled and the ChatGPT Chrome extension connected.
- **Playwright 1.62 Chromium** with a clearly isolated test-only `document.modelContext` harness for repeatable regression tests; this is not counted as the real-browser WebMCP evidence.

## Which AI tools have you leveraged while working on this project?

- **OpenAI Codex with GPT-5.6 Sol** for architecture, implementation, refactoring, test generation and execution, browser validation, plugin packaging, documentation, and deployment verification.
- **ChatGPT/Codex in-app browser agent** for real `document.modelContext` discovery, live WebMCP calls, and the human/agent incident workflow.
- **ChatGPT Chrome extension** for cross-client WebMCP and live-site testing.
- **ChatGPT Sites** for building and publishing the public Challenge deployment.

All fifteen gallery images are lossless captures of real Runbook Zero application states; no generative image tool was used to fabricate product screens.

## Links

- Live app: <https://runbook-zero.rookepoole.chatgpt.site/>
- Public source: <https://github.com/rookepoole/runbook-zero>
- AGPL-3.0 license: <https://github.com/rookepoole/runbook-zero/blob/main/LICENSE>
- Judging evidence: <https://github.com/rookepoole/runbook-zero/blob/main/docs/judging-evidence.md>
- Demo video: **replace with the final public YouTube URL**
