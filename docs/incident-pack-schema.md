# Incident Pack v1

An Incident Pack is the complete, deterministic input to the Runbook Zero incident domain. Presentation components, domain commands, recovery simulation, and WebMCP executors read the active pack; none of those layers require scenario-specific code.

The easiest way to create a pack is to open **Incident Packs**, download one of the bundled JSON files, change its identifiers and data, then import it locally. Imported files never leave the browser.

## Top-level contract

| Field                                                     | Purpose                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `schemaVersion`                                           | Must equal `1`.                                                                                                          |
| `packId`, `name`, `summary`, `canonical`, `seed`          | Stable identity and launcher metadata. Imported packs are always marked non-canonical.                                   |
| `agentPrompt`, `impactPath`, `topologyTitle`              | Incident-specific presentation copy supplied as data.                                                                    |
| `defaultServiceId`, `defaultFlow`                         | Initial human focus and canonical request flow.                                                                          |
| `eventBaseTimestamp`, `recoveryTimestamp`                 | Fixed clocks for deterministic event and recovery frames.                                                                |
| `incident`                                                | ID, title, severity, start time, affected services, and customer impact. Runtime status is derived by the state machine. |
| `services`, `baselineServices`                            | Current and known-good telemetry keyed by service ID.                                                                    |
| `topology`, `topologyLayout`                              | Dependency adjacency lists and normalized node coordinates.                                                              |
| `flows`                                                   | Named primary paths and branches used by `trace_request_path`.                                                           |
| `changes`                                                 | Deploy/config/flag evidence with exact before-and-after diffs.                                                           |
| `evidence`                                                | Trace, telemetry, configuration, and change evidence bound to service IDs.                                               |
| `mitigationCandidates`                                    | Reversible candidate actions, predictions, risks, assumptions, and exact changes.                                        |
| `mitigationEffects`                                       | Resulting configuration and one-to-ten deterministic telemetry frames for each candidate.                                |
| `configTargetServiceId`, `systemConfig`, `baselineConfig` | Active and known-good configuration presented by service inspection.                                                     |
| `recoveryThresholds`                                      | Pack-specific `lte` or `gte` checks used by `verify_recovery`.                                                           |
| `timeline`                                                | Initial deterministic incident events.                                                                                   |

## Validation and safety

Runbook Zero rejects a pack before activation when any of these checks fail:

- JSON exceeds 1 MB, is malformed, or contains unsafe prototype-related keys;
- required strings, timestamps, finite non-negative telemetry values, enums, or arrays are invalid;
- the pack contains fewer than two or more than 24 services;
- service, topology, flow, evidence, mitigation, recovery-frame, or threshold references do not resolve;
- topology coordinates fall outside the supported canvas;
- a change has no exact diff, a candidate has no exact action, or an effect has no recovery frame;
- a recovery frame attempts to update anything other than supported telemetry fields.

Failed imports do not replace or mutate the active incident. Duplicate pack IDs are also rejected.

## WebMCP behavior

All packs use the same 12 tool names and domain commands. The registry derives service IDs, flow IDs, and candidate mitigation IDs from the active pack. In the approved phase, the input schema for `apply_approved_mitigation` contains only the exact approved mitigation ID.

The core invariant is independent of pack content:

```text
if stagedMitigation.status !== "approved"
then apply_approved_mitigation is not registered
```

Importing a pack cannot add an approval tool, change the state machine, inject a new WebMCP executor, or bypass the domain's incident/seed/mitigation approval binding.
