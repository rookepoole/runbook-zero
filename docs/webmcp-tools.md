# WebMCP tool surface

Runbook Zero defines 12 page tools shared by every Incident Pack. The active subset is derived from application phase; stale registrations are cancelled with an `AbortController` whenever the phase or active pack changes.

| Tool                        | Responsibility                                         | Availability                              |
| --------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `get_system_snapshot`       | Read incident and unhealthy-service summary            | All phases                                |
| `inspect_service`           | Read one service's telemetry, dependencies, and config | All phases                                |
| `query_signals`             | Compare current and baseline signals                   | All phases                                |
| `trace_request_path`        | Trace a request flow declared by the active pack       | All phases                                |
| `get_recent_changes`        | Read deploy/config changes near the incident           | All phases                                |
| `set_working_hypothesis`    | Publish the agent diagnosis to the shared UI           | Open through approved incident phases     |
| `compare_mitigations`       | Rank simulated candidates under operator constraints   | Open through approved incident phases     |
| `stage_mitigation`          | Stage one candidate without applying it                | Open/investigating/candidate phases       |
| `discard_staged_mitigation` | Invalidate the staged change and approval binding      | Staged/awaiting-approval only             |
| `apply_approved_mitigation` | Apply the exact visibly human-approved mitigation      | **Approved only**                         |
| `verify_recovery`           | Compare live values with recovery thresholds           | Approved, mitigating, and resolved phases |
| `add_incident_note`         | Add an agent-authored timeline note                    | Incident and recovery phases              |

## Exact phase surfaces

| Phase group                                               | Count | Added/removed behavior                                 |
| --------------------------------------------------------- | ----: | ------------------------------------------------------ |
| `BOOT`, `HEALTHY`                                         |     5 | Read-only base tools                                   |
| `INCIDENT_OPEN`, `INVESTIGATING`, `MITIGATION_CANDIDATES` |     9 | Adds hypothesis, comparison, staging, and notes        |
| `MITIGATION_STAGED`, `AWAITING_HUMAN_APPROVAL`            |    10 | Adds discard; apply remains absent                     |
| `APPROVED`                                                |    10 | Adds apply and verify; removes stage/discard           |
| `MITIGATING`, `RESOLVED`, `POSTMORTEM_READY`              |     7 | Apply is removed; base reads, verify, and notes remain |

## What is deliberately not a tool

Human approval is not registered through WebMCP. The agent may investigate, compare, stage, apply an already approved change, verify, and document. Only the human can cross the approval boundary through the visible application control.

## Pack-dependent schemas, stable contracts

Tool names and responsibilities do not change between packs. Their JSON schemas narrow identifiers to the active incident:

- `inspect_service`, `query_signals`, and optional change filtering enumerate only active service IDs;
- `trace_request_path` enumerates only active flow IDs;
- `stage_mitigation` enumerates only candidates defined by the active pack;
- `apply_approved_mitigation` is absent before approval and, when registered, enumerates only the exact approved mitigation ID.

Switching packs aborts the old registrations even if the new incident begins in the same phase. This prevents stale scenario schemas from remaining discoverable.

## Failure behavior

- Calling a tool absent from the current snapshot fails as unavailable.
- A handle fetched before a phase-changing action fails as stale and must be refreshed.
- Apply rejects a mitigation ID that does not match the approval binding.
- A contradictory state with phase `APPROVED` but no approved staged object still excludes apply.
- Discard invalidates the staged object and any approval relationship.
- Repeated apply is impossible because the state leaves `APPROVED` and the tool registration is aborted immediately.
