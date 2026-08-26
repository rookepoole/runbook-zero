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

- This proves Gate 1 only; it does not claim the Gate 2 domain core, dynamic multi-state registry, human approval boundary, canonical J1–J4 journey, or deployed-origin behavior.
- The current UI is a restrained Gate 1 surface, not the final frozen four-region product interface.
