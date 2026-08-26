# Runbook Zero operational constitution

- Follow the private project authority supplied by the owner. It is intentionally maintained outside this public repository. Accepted public ADRs govern repository changes beneath that authority.
- Finish and freeze Priority 1 as `submission-v1.0` before beginning any Priority 2 commercial infrastructure.
- Preserve frozen architecture and requirements. Change one only through an ADR recording evidence, impact, the smallest replacement, and regression gates.
- Use only `PLANNED`, `IMPLEMENTED`, `TESTED`, `BLOCKED`, or `CUT`. A claim is `TESTED` only when its acceptance evidence is recorded.
- Execute the earliest incomplete blocking gate when asked for the next best move.
- WebMCP is a core capability: use real `document.modelContext` tools, dynamic state-aware registration, and visible synchronization with the human interface.
- Mocked `document.modelContext`, unit tests, screenshots, or an app-owned inspector are not real WebMCP acceptance evidence. Gates requiring WebMCP need supported-browser discovery and invocation evidence.
- Human UI and WebMCP tools must call shared domain queries and commands; do not create divergent agent-only behavior.
- Human approval is visible, UI-only, and bound to the exact staged mitigation. There is no WebMCP approval tool.
- If `stagedMitigation.status !== "approved"`, `apply_approved_mitigation` must not be registered. Its executor must also revalidate incident, mitigation ID, approval status, and invalidation state.
- Staging is never applying. Agent proposal is never human approval.
- Run relevant typecheck, lint, unit, build, browser, registry, state-machine, and safety tests for every substantive change; do not weaken tests for green output.
- At substantive checkpoints, record public judging evidence and synchronize the owner's private implementation ledger and handoff with actual repository state.
- Never commit or publish private planning, design-research, commercial-strategy, continuation/handoff, or freeze-manifest source documents.
- Preserve deterministic `INC-042` reset behavior and do not begin optional polish or productization while a higher-priority WebMCP, safety, reliability, deployment, or submission blocker remains.
