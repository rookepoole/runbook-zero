# Runbook Zero judging evidence

## Gate 0 — Rule compliance

Status: **IMPLEMENTED / BLOCKED**

Date: 2026-08-25

Candidate commit: `f919de76061406481a1d3db264700a1ce7eef65d`

### Verified requirements

| Requirement                               | Status      | Evidence                                                                                                                                                      |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligible-period creation                  | TESTED      | GitHub repository created `2026-08-25T23:27:02Z`; first commit `2026-08-25T18:27:03-05:00`, after the official `2026-08-25T18:00:00Z` submission-period start |
| Public repository                         | TESTED      | GitHub API reports `private: false` for `rookepoole/runbook-zero`                                                                                             |
| Visible open-source license               | TESTED      | GitHub API detects `AGPL-3.0`; canonical text is in `LICENSE`                                                                                                 |
| Working live URL                          | TESTED      | public ChatGPT Sites origin returns anonymous HTTPS `200` without a sign-in redirect                                                                          |
| WebMCP implementation                     | TESTED      | production registry calls `modelContext.registerTool`; local and deployed supported-browser receipts are recorded below                                       |
| Submission fields                         | IMPLEMENTED | paste-ready narrative and links are in `docs/submission-copy.md`                                                                                              |
| Testing instructions                      | IMPLEMENTED | README contains installation, browser, validation, and canonical judging steps                                                                                |
| No-touch freeze plan                      | IMPLEMENTED | `submission-v1.0` will be created only after video, final deployment, Devpost, and confirmation; no judged artifact will change afterward                     |
| Public YouTube demo under 3:00 with audio | BLOCKED     | exact 2:20–2:40 recording script is ready; entrant recording/upload URL is still required                                                                     |

The official rules require the demo to be publicly visible on YouTube, shorter than three minutes, and accompanied by clear audio explaining the product and WebMCP use. Gate 0 therefore remains non-passing until that external artifact exists.

Artifact: `docs/evidence/gate-0-rule-compliance-receipt.json`

### Claim boundary

This receipt proves every locally or publicly verifiable Gate 0 requirement except the required video. It does not claim submission, final tag, or post-deadline freeze.

## Gate 1 — First real WebMCP round trip

Status: **TESTED**  
Date: 2026-08-25  
Implementation commit: `6b7e2e067614415da74765ee340f8d37de1a39a7`
Application origin: `http://127.0.0.1:4173/`  
WebMCP environment: ChatGPT Codex in-app browser  
Local toolchain: Node.js `v24.18.0`, npm `11.16.0`, React `19.2.8`, Vite `8.2.2`

### Commands run

```text
npm run typecheck  PASS
npm run lint       PASS
npm run test       PASS — 5 files, 7 tests
npm run build      PASS — Vite production build
git diff --check   PASS
```

### Real WebMCP steps

1. Started the real Vite page at `http://127.0.0.1:4173/`.
2. Opened it in ChatGPT Codex's WebMCP-capable in-app browser.
3. The browser discovered one page-defined tool: `get_system_snapshot`.
4. Discovery showed the expected description, empty-object JSON schema, `readOnlyHint: true`, `untrustedContentHint: false`, and local origin.
5. Invoked `get_system_snapshot` through the browser's WebMCP tool capability, not through an app-owned mock or direct domain-function call.
6. Received structured incident data for `INC-042` and four unhealthy services.
7. Re-inspected the same live page and observed `WebMCP Connected`, `AGENT FOCUS`, `Agent inspected the live system snapshot.`, and `Invocation 1`.

### Classification

| Property                           | Status  | Evidence                                                                      |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------- |
| Capability fallback                | TESTED  | JSDOM UI test keeps overview/reset usable without `document.modelContext`     |
| Scenario A initialization          | TESTED  | deterministic equality test plus frozen checkout/inventory-db values          |
| Shared snapshot domain query       | TESTED  | unit test and both UI/tool callers use `getSystemSnapshot`                    |
| Registry seam/lifecycle            | TESTED  | contract, annotations, execution, visible-state command, and AbortSignal test |
| Visible UI reaction                | TESTED  | component test plus real-browser post-invocation DOM                          |
| Real WebMCP registration/discovery | TESTED  | in-app browser tool notification and `fetchTools()` result                    |
| Real WebMCP invocation/output      | TESTED  | browser `tools.call("get_system_snapshot", {})` structured result             |
| Deployed-origin WebMCP             | PLANNED | required by Gate 8; not claimed by this local receipt                         |

### Artifacts

- `docs/evidence/gate-1-webmcp-receipt.json`
- `docs/screenshots/gate-1-real-webmcp.png`
- Screenshot SHA-256: `a8dcdeb5b20b119383719af54e0852a49cbee2270ae49caf457a0cbbef905a4b`

### Known limitations

- This Gate 1 receipt alone does not claim the dynamic multi-state registry, human approval boundary, canonical J1–J4 journey, or deployed-origin behavior.
- The current UI is a restrained Gate 1 surface, not the final frozen four-region product interface.

## Gate 2 — Deterministic incident core

Status: **TESTED**

Date: 2026-08-25

Implementation commit: `bf85abbfd06f3ef17d4681553678210cb0632206`

### Commands run

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 9 files, 23 tests
npm run build         PASS — Vite production build
git diff --check      PASS
```

### Acceptance evidence

| Property                             | Status | Evidence                                                                                         |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------ |
| Reproducible Scenario A reset        | TESTED | independent deep state graphs compare exactly across resets                                      |
| Root-cause evidence                  | TESTED | checkout trace reaches `inventory-db`; change records `dbPoolSize` 80 → 12 in `inventory-v2.7.0` |
| Deterministic mitigation truth table | TESTED | fixed P95 predictions 390 / 420 / 650 ms and stable constraint-aware ordering                    |
| Frozen phase transitions             | TESTED | canonical state path and discard edge; invalid phase jumps rejected                              |
| Staging is non-mutating              | TESTED | telemetry and production configuration deep-equal before and after staging                       |
| Exact human approval binding         | TESTED | wrong IDs and cross-incident replay rejected; approval produces a human-authored timeline event  |
| Pre-approval application impossible  | TESTED | apply rejects staged-but-unapproved state                                                        |
| Discard invalidates approval         | TESTED | staged binding is removed, phase returns to investigation, later application fails               |
| Apply exits approved state           | TESTED | exact approved effect moves immediately to `MITIGATING`                                          |
| Deterministic five-step recovery     | TESTED | identical replays reach 420 ms checkout P95, 0.8% errors, 68% DB saturation, and `RESOLVED`      |
| Gate 1 adapter regression            | TESTED | registry, capability, UI, and system-snapshot tests remain green                                 |

### Artifacts

- `docs/evidence/gate-2-domain-receipt.json`

### Claim boundary

Gate 2 establishes the deterministic domain, state-machine, command, query, and recovery foundations under automated tests. Dynamic WebMCP registration and the full J1–J4 interface remain subsequent gates and are not claimed here.

## Gate 3 — Dynamic WebMCP state

Status: **TESTED**

Date: 2026-08-25

Implementation commit: `04e82bc70448fd3958b940eec968277c0ade0e81`

### Commands run

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 10 files, 37 tests
npm run build         PASS — Vite production build
git diff --check      PASS
```

### Acceptance evidence

| Property                              | Status | Evidence                                                                                          |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Exact phase-derived registry          | TESTED | table-driven assertions cover all 11 application phases                                           |
| Awaiting approval excludes apply      | TESTED | exact negative assertion for `AWAITING_HUMAN_APPROVAL`                                            |
| Approved phase includes apply         | TESTED | exact positive assertion for `APPROVED`                                                           |
| Human approval remains outside WebMCP | TESTED | the 12-name canonical registry contains no approval tool                                          |
| Stale registration cleanup            | TESTED | all prior `AbortSignal`s become aborted when phase changes                                        |
| Apply immediately removes itself      | TESTED | invoking the approved tool moves state to `MITIGATING`; its registration is aborted and not added |
| Real incident-state registration      | TESTED | ChatGPT Codex in-app browser discovered the exact 9-tool `INCIDENT_OPEN` surface                  |
| Visible active-tool synchronization   | TESTED | the same browser page visibly reported `WebMCP Connected` and `9 tools active`                    |
| Gate 1 and Gate 2 regression          | TESTED | all prior capability, UI, registry, domain, safety, and recovery tests remain green               |

### Artifacts

- `docs/evidence/gate-3-registry-receipt.json`

### Claim boundary

Gate 3 proves the exact dynamic registry and its cleanup behavior in automated lifecycle tests, plus real WebMCP registration for the initial incident phase. Real-browser J1–J2 diagnosis and the visible human approval transition remain Gates 4–5.

## Gate 4 — Canonical agent diagnosis

Status: **TESTED**

Date: 2026-08-25

Implementation commit: `ad83d3e25d4770ae018a3d32b4373efdcfc32ace`

### Real WebMCP J1–J2 replay

The canonical journey was run on `http://127.0.0.1:4173/` in the ChatGPT Codex in-app browser using the page-defined WebMCP tools:

1. `get_system_snapshot` returned checkout P95 4,700 ms, 17% errors, and four unhealthy services.
2. `trace_request_path({ flow: "checkout" })` returned `edge → gateway → checkout → inventory → inventory-db` plus the payments, cache, and event-queue branches.
3. `query_signals({ serviceId: "inventory-db", window: "30m" })` returned 97% saturation versus a 45% baseline, 3,910 ms P95 versus 35 ms, and 15.9% errors versus 0.1%.
4. `get_recent_changes({ serviceId: "inventory", since: "60m" })` returned `CHG-271`: `inventory-v2.7.0` changed `dbPoolSize` from 80 to 12.
5. `set_working_hypothesis` recorded the pool reduction and downstream checkout propagation on the visible workspace.
6. `compare_mitigations({ excludeKinds: ["rollback"], optimizeFor: "lowest-risk" })` returned only `M-POOL-RESTORE` and `M-CACHE-DEGRADE`, ranking pool restoration first at 420 ms predicted P95 and 0.8% errors.
7. `stage_mitigation({ mitigationId: "M-POOL-RESTORE" })` produced the exact staged binding for `INC-042`, seed 42.
8. A real WebMCP call to `apply_approved_mitigation` from the awaiting-approval tool snapshot failed because the tool was unavailable.

The same live page visibly showed the traced dependency path, agent-authored hypothesis, inventory-db telemetry and config evidence, agent timeline events, `STAGED — NOT APPLIED`, the exact `dbPoolSize 12 → 80` diff, risk, reversibility, and human controls.

### Automated checks

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 11 files, 39 tests
npm run build         PASS
git diff --check      PASS
```

Artifact: `docs/evidence/gate-4-j1-j2-receipt.json`

## Gate 5 — Human approval boundary

Status: **TESTED**

Date: 2026-08-25

Implementation commit: `ad83d3e25d4770ae018a3d32b4373efdcfc32ace`

### Real browser evidence

- Before approval, the staged card visibly read `STAGED — NOT APPLIED`, the apply tool was absent, and an invocation attempt was rejected as unavailable.
- The visible **Approve staged mitigation** button was clicked directly in the page; no approval WebMCP tool exists.
- The card changed to `✓ HUMAN APPROVED`, the timeline added `M-POOL-RESTORE approved by human` with `HUMAN` provenance, and the application entered `APPROVED`.
- The refreshed real WebMCP surface added `apply_approved_mitigation` for the exact approved mitigation.
- `inspect_service({ serviceId: "inventory" })` returned the identical pre/post-approval production configuration: release `inventory-v2.7.0`, pool size 12, stale-cache window 0. Telemetry also remained incident-state; approval did not apply anything.

Automated UI/lifecycle tests additionally assert the staged diff, pre-approval absence of apply, human approval event, approved label, and post-click apply registration.

Artifact: `docs/evidence/gate-5-approval-receipt.json`

### Claim boundary

Gates 4–5 establish local real-browser J1–J3 through visible approval. They do not yet claim applied recovery, the full reset-to-resolved J1–J4 E2E, deployment, or final visual/accessibility acceptance.

## Gate 6 — End-to-end resolution

Status: **TESTED**

Date: 2026-08-25

Implementation commit: `b3f241e3305044871b43c572826c8be3f07cd140`

### Real WebMCP J4 replay

1. From the visibly human-approved state, the real page-defined `apply_approved_mitigation({ mitigationId: "M-POOL-RESTORE" })` tool returned `MITIGATING` and recovery frame 0 of 5.
2. The registry immediately changed to seven tools without `apply_approved_mitigation`; a second invocation attempt was rejected as unavailable.
3. The shared UI advanced through five fixed one-second telemetry frames without random jitter and reached `RESOLVED`.
4. `verify_recovery` remained read-only and returned all checks passing: checkout P95 420 ≤ 500 ms, checkout errors 0.8 ≤ 1%, and inventory-db saturation 68 ≤ 70%.
5. `add_incident_note` recorded: “Pool size restored to 80; checkout P95 and errors returned below recovery thresholds.”
6. The resolved page visibly showed all topology nodes healthy, checkout P95 420 ms, errors 0.8%, the applied mitigation, a resolved checklist message, five system recovery events, and the agent note.

### Automated checks

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 12 files, 40 tests
npm run build         PASS
git diff --check      PASS
```

The UI recovery test uses fake time to assert frame 1, frame 4, exact final telemetry, the five-second duration, and the resolved state. Domain replay tests independently verify deterministic equality.

Artifact: `docs/evidence/gate-6-resolution-receipt.json`

### Claim boundary

Gate 6 establishes the complete local real-browser J1–J4 workflow. Gate 7 execution/polish, full browser E2E automation, deployed-origin behavior, and submission freeze remain outstanding.

## Gate 7 — Execution and polish

Status: **IMPLEMENTED / REOPENED FOR ACCEPTANCE**

Date: 2026-08-25

Current UX implementation commit: `aaa8ba77d76125b71edcb46e373276ce56d6e4fc`

### Browser automation

Playwright now replays the entire reset-to-resolved workflow in Chromium through a test-only `document.modelContext` harness that exercises the production registry and real tool executors. It asserts:

- the exact 9-tool initial surface;
- snapshot, checkout trace, inventory-db signals, and the 80 → 12 change record;
- the no-rollback comparison and exact `M-POOL-RESTORE` staging;
- absence of apply before approval;
- keyboard-triggered visible human approval and post-approval apply exposure;
- immediate apply removal after invocation;
- automatic five-second resolution, passing read-only verification, and incident note;
- deterministic reset back to 4,700 ms P95 and the 9-tool initial surface;
- zero console/page errors throughout the canonical flow.

A second browser test checks 1280×720 and 1440×900 layouts, horizontal overflow, reduced-motion CSS, keyboard focus/reset activation, required workspace regions, dependency edges, four telemetry trends, precise change inspection, Focus Mode, and absence of placeholder text.

This automation supplements—but does not replace—the real supported-browser WebMCP evidence recorded for Gates 1 and 3–6.

### Usability reconstruction

The project owner rejected the earlier interface as insufficiently usable and too shallow relative to the frozen design research. That evidence invalidated the earlier uncorroborated 5/5 claim and reopened Gate 7.

The replacement at `aaa8ba77d76125b71edcb46e373276ce56d6e4fc` implements the smallest architecture-preserving correction:

- a real connected dependency graph with upstream/downstream inspection and durable agent-path evidence;
- a continuously visible Depth-0 triage strip;
- baseline deltas, deterministic trend shapes, change markers, timestamps, and evidence IDs for every selected service;
- confidence and evidence bindings on the working hypothesis;
- complete mitigation comparison detail, simulation assumptions, and exact incident/seed/mitigation approval scope;
- filterable, inspectable Agent/Human/System/change evidence;
- contextual, provenance-labeled Focus Mode with `Escape` dismissal;
- internally consistent resolved telemetry and authority/config state.

Automated visual and interaction checks pass, and refreshed 1440×900 canonical stills have been reviewed. The required fresh-viewer 4/5 acceptance must be repeated against the revised public deployment before Gate 7 returns to **TESTED**.

### Full check result

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 12 files, 42 tests
npm run test:e2e      PASS — 2 Chromium tests
npm run build         PASS
git diff --check      PASS
```

Artifact: `docs/evidence/gate-7-execution-receipt.json`

### Claim boundary

The revised Gate 7 implementation is locally tested, but Gate 7 remains reopened until the fresh-viewer acceptance is repeated on the revised public deployment. The currently public Sites version predates this correction, so Gate 8 must also be reconfirmed after an explicitly approved update.

## Gate 8 — Public deployment

Status: **TESTED FOR PRIOR DEPLOYMENT / REOPENED FOR CURRENT CANDIDATE**

Date: 2026-08-25

Deployment implementation commit: `cb105921fec5425c4f0a2d9136362f65e44aaf0c`

Live URL: <https://runbook-zero.rookepoole.chatgpt.site>

### ChatGPT Sites deployment

The validated React/Vite application is deployed on ChatGPT Sites as public version 1. An anonymous HTTPS request returned `200` directly from the live URL with no sign-in redirect. The deployment source was the exact pushed commit above, and the production build contains the Cloudflare Worker-compatible Sites entry point plus the same client bundle used by local validation.

### Real deployed-origin WebMCP evidence

The supported ChatGPT Codex in-app browser loaded the production URL and discovered 9 real page-defined `document.modelContext` tools from origin `https://runbook-zero.rookepoole.chatgpt.site`.

The deployed browser then completed the canonical `INC-042` flow:

- gathered the system snapshot, checkout trace, inventory-db configuration/signals, and the `80 → 12` recent change;
- recorded the high-confidence pool-saturation hypothesis;
- compared mitigations with rollback excluded and staged `M-POOL-RESTORE`;
- observed the 10-tool staged surface with no apply tool;
- directly attempted `apply_approved_mitigation` before approval and received a tool-unavailable failure;
- clicked the visible **Approve staged mitigation** control as the human operator;
- observed `HUMAN APPROVED` and the apply tool appearing only afterward;
- applied the exact approved mitigation and observed apply disappear immediately;
- verified deterministic recovery at 420 ms checkout P95, 0.8% checkout errors, and 68% inventory-db saturation;
- added an agent-authored recovery note;
- reset through the visible UI and returned to 4,700 ms checkout P95, the exact 9-tool initial surface, and no apply tool.

### Final deployment checks

```text
npm run typecheck     PASS
npm run format:check  PASS
npm run lint          PASS
npm run test          PASS — 12 files, 40 tests
npm run test:e2e      PASS — 2 Chromium tests
npm run build         PASS
npm audit             PASS — 0 vulnerabilities
git diff --check      PASS
anonymous HTTPS       PASS — 200, no sign-in redirect
deployed WebMCP       PASS — canonical J1–J4 and reset
```

Artifact: `docs/evidence/gate-8-deployment-receipt.json`

### Claim boundary

Gate 8 establishes a public, direct-link ChatGPT Sites deployment and real supported-browser WebMCP behavior on that deployed origin. Submission documentation, demo assets, final SHA/tag, and the immutable `submission-v1.0` freeze remain Gate 9.

## Gate 9 — Submission package and live rehearsal

Status: **IMPLEMENTED / BLOCKED**

Date: 2026-08-25

Repository-package candidate: `f919de76061406481a1d3db264700a1ce7eef65d`

### Implemented and tested

- judge-first README with live URL, canonical prompts, safety thesis, local setup, validation commands, and repository map;
- architecture and exact phase-derived WebMCP lifecycle documentation;
- paste-ready submission narrative covering fit, user experience, human/agent collaboration, and implementation;
- exact 2:20–2:40 recording script and acceptance checklist;
- four reviewed 1440×900 browser stills for the submission gallery;
- GitHub metadata with public visibility, live homepage, challenge topics, and detected AGPL-3.0 license;
- package version `1.0.0` and site-wide Open Graph/X preview metadata;
- final candidate checks: typecheck, format, lint, 40 Vitest tests, 2 Playwright tests, build, zero npm audit findings, and diff check.

### Real deployed-origin rehearsal

The supported in-app browser repeated the full public-site workflow from reset in **62.696 seconds of measured tool/control time**:

- initial discovery: 9 tools;
- diagnosis completed at 20.388 seconds;
- no-rollback comparison and exact staging completed at 25.657 seconds;
- direct pre-approval apply was unavailable;
- visible human approval completed at 25.968 seconds and exposed apply;
- exact apply, five recovery frames, verification, and note completed by 62.696 seconds;
- final verification returned `recovered: true` and the UI showed `RESOLVED`;
- post-rehearsal reset restored 4,700 ms checkout P95, 9 tools, and no apply.

The semantic text wait used during the rehearsal timed out once even though a subsequent direct DOM snapshot and `verify_recovery` call proved the incident was resolved. The complete workflow still finished well inside the recording budget; this browser-selector timing artifact is retained rather than hidden.

Artifact: `docs/evidence/gate-9-live-rehearsal-receipt.json`

### Remaining blockers

- record the real live workflow with clear entrant audio;
- upload the sub-three-minute video publicly to YouTube and insert its URL;
- approve and publish the final saved Sites candidate;
- complete Devpost and capture confirmation;
- record final SHA/deployment and tag `submission-v1.0`;
- freeze the repository, live site, and submission through judging.

### Claim boundary

The repository package and live rehearsal are ready. Gate 9 is not passed, and no submission/freeze is claimed, until the required public audio video, final deployment, Devpost confirmation, and tag exist.
