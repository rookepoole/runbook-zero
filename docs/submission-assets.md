# Devpost project gallery

Upload these fifteen lossless product captures in numeric order. Every file is exactly **1500 × 1000 pixels (3:2)** and shows a real application state produced through the Runbook Zero domain, registry, and WebMCP executors. No generative image tool was used.

|   # | File                                                                                                                 | Devpost caption                                                                                                                                                                           |
| --: | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | [`01-runbook-zero-incident-command.png`](screenshots/devpost-gallery/01-runbook-zero-incident-command.png)           | **Runbook Zero — incident command for humans and agents.** One workspace combines topology, telemetry, evidence, exact mitigation review, and the live WebMCP capability surface.         |
|   2 | [`02-checkout-dependency-topology.png`](screenshots/devpost-gallery/02-checkout-dependency-topology.png)             | **Trace the customer-impact path.** Focus Mode expands the dependency graph while preserving the incident context, telemetry, and audit trail.                                            |
|   3 | [`03-live-telemetry-evidence.png`](screenshots/devpost-gallery/03-live-telemetry-evidence.png)                       | **Compare current signals with the known-good baseline.** Pack-driven telemetry exposes change markers and correlated configuration evidence.                                             |
|   4 | [`04-agent-evidence-trail.png`](screenshots/devpost-gallery/04-agent-evidence-trail.png)                             | **Agent actions are visible, attributed, and evidence-bound.** Tool calls focus the same interface and add explicit Agent, System, and Change provenance.                                 |
|   5 | [`05-low-risk-mitigation-comparison.png`](screenshots/devpost-gallery/05-low-risk-mitigation-comparison.png)         | **Constraints change the recommendation.** The agent excludes rollback, compares risk and recovery predictions, and presents reversible alternatives.                                     |
|   6 | [`06-exact-change-awaiting-human.png`](screenshots/devpost-gallery/06-exact-change-awaiting-human.png)               | **Staged is not applied.** The exact `dbPoolSize 12 → 80` action, target, risk, reversibility, assumptions, incident, and seed await a human decision.                                    |
|   7 | [`07-capability-firewall-locked.png`](screenshots/devpost-gallery/07-capability-firewall-locked.png)                 | **Pre-approval apply is absent.** The Capability Firewall shows ten active capabilities while `apply_approved_mitigation` remains locked outside the registered tool surface.             |
|   8 | [`08-human-approval-unlocks-apply.png`](screenshots/devpost-gallery/08-human-approval-unlocks-apply.png)             | **Visible human approval changes the WebMCP surface.** Only the exact approved mitigation becomes available; the human approval control never becomes an agent tool.                      |
|   9 | [`09-verified-deterministic-recovery.png`](screenshots/devpost-gallery/09-verified-deterministic-recovery.png)       | **Recovery is verified, not assumed.** Five deterministic frames satisfy thresholds, apply disappears, and the shared timeline records the resolution.                                    |
|  10 | [`10-generalized-incident-pack-launcher.png`](screenshots/devpost-gallery/10-generalized-incident-pack-launcher.png) | **A reusable incident platform, not one scripted demo.** Launch bundled incidents, connect a live site through the Codex plugin, or import a locally validated JSON pack.                 |
|  11 | [`11-payment-queue-incident.png`](screenshots/devpost-gallery/11-payment-queue-incident.png)                         | **Payment queue backlog.** A different severity, topology, user flow, telemetry profile, regression, and action run through the same domain and WebMCP contracts.                         |
|  12 | [`12-same-contracts-new-incident.png`](screenshots/devpost-gallery/12-same-contracts-new-incident.png)               | **Dynamic schemas and authority for every pack.** Human approval unlocks only `M-PAY-CONCURRENCY-RESTORE`, restoring consumer concurrency from 4 to 24.                                   |
|  13 | [`13-catalog-cache-stampede.png`](screenshots/devpost-gallery/13-catalog-cache-stampede.png)                         | **Catalog cache stampede.** The generalized UI renders a TTL regression, cache/database dependency graph, and incident-specific signals without scenario-specific presentation code.      |
|  14 | [`14-live-site-evidence-derived-graph.png`](screenshots/devpost-gallery/14-live-site-evidence-derived-graph.png)     | **New site, new graph.** The installed plugin converts bounded browser evidence into a provisional diagnosis, observed capability inventory, and deterministic evidence-derived topology. |
|  15 | [`15-approval-bound-action-receipt.png`](screenshots/devpost-gallery/15-approval-bound-action-receipt.png)           | **Cross-origin execution stays honest.** After visible approval, Runbook Zero releases an exact origin/tool/input receipt and exposes result synchronization while removing apply.        |

## Regenerate

The gallery capture is opt-in so an ordinary browser-test run does not rewrite submission artifacts.

PowerShell:

```powershell
$env:CAPTURE_DEVPOST_GALLERY = "1"
npx playwright test tests/browser/devpost-gallery.e2e.ts
Remove-Item Env:CAPTURE_DEVPOST_GALLERY
```

Bash:

```bash
CAPTURE_DEVPOST_GALLERY=1 npx playwright test tests/browser/devpost-gallery.e2e.ts
```

The capture test supplies an isolated test-only `document.modelContext` harness while exercising the production registry and tool executors. Real supported-browser WebMCP evidence remains separately recorded in [judging-evidence.md](judging-evidence.md). Do not substitute these stills for the required under-three-minute narrated demo video.

## Earlier evidence stills

The original full-page evidence images remain in [`docs/screenshots`](screenshots/) for traceability. Use the numbered 3:2 gallery above for Devpost.
