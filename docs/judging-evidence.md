# Runbook Zero judging evidence

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
