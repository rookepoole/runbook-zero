# Runbook Zero

Runbook Zero is a WebMCP-native incident command environment where a human and an agent investigate production failures together on the same live browser surface.

Challenge Edition status: Gate 1 passes locally with real WebMCP discovery and invocation in ChatGPT's in-app browser. The complete `INC-042` journey, deployment, and submission package remain in progress.

## Gate 1

The page registers `get_system_snapshot` through the real `document.modelContext.registerTool` API. The tool calls the same domain query used by the visible system overview, returns structured incident data, and visibly focuses the overview when an agent invokes it. The human interface remains usable when WebMCP is unavailable.

## Local development

```bash
npm install
npm run dev
```

Use ChatGPT's WebMCP-capable in-app browser or a supported Chrome build to discover and invoke the tool.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Safety boundary

The Challenge Edition will never expose `apply_approved_mitigation` until the exact staged mitigation has received visible human approval. Staging is not applying, and agent proposal is not human approval.

## Project authority

`PARS_DEEP_MASTER_BUILD_PLAN.md` is the authoritative architecture and implementation ledger. `CODEX_CONTINUATION_PACKAGE.md` is the synchronized operational handoff.

## License

Runbook Zero Challenge Edition is licensed under the GNU Affero General Public License v3.0. See `LICENSE`.
