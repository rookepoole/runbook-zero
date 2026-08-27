# Site Capture v2

Site Capture v2 turns evidence from a selected browser session into a new incident and graph. The graph is a claim about observed relationships, not a discovery license: every component, dependency, flow, change, and provisional diagnosis must be traceable to bounded evidence from the exact target investigation.

## Modeling rules

- Use stable, descriptive component IDs such as `checkout-api` or `session-store`; do not reuse generic `page-runtime` nodes when evidence identifies real components.
- Include 2–24 components and at least one evidence-backed dependency and user flow. Every consecutive flow hop must exist as a dependency.
- Prefer measured telemetry and baselines. If no measured baseline is available, set `baselineKind` to `reference-budget` and omit component baselines rather than inventing history.
- State a single provisional diagnosis with `low`, `medium`, or `high` confidence, evidence IDs, and implicated component IDs. Preserve credible alternatives in evidence summaries or the eventual agent hypothesis.
- A component or dependency without support does not belong in the graph. Do not infer backend architecture solely from page copy, route names, or generic framework conventions.
- A candidate action must target one modeled component and name an exact tool observed on the target origin. Otherwise use `operatorHandoff`.

## Required shape

```json
{
  "schemaVersion": 2,
  "sessionId": "SITE-CHECKOUT-002",
  "capturedAt": "2026-08-27T16:00:00.000Z",
  "capturedBy": "codex-browser-extension",
  "baselineKind": "measured-baseline",
  "target": {
    "url": "https://shop.example/checkout",
    "title": "Shop checkout",
    "symptom": "Checkout requests time out after authorization.",
    "customerImpact": "Customers do not receive order confirmations.",
    "severity": "SEV-1"
  },
  "signals": {
    "pageLoadMs": 5200,
    "resourceP95Ms": 2400,
    "failedRequests": 9,
    "resourceCount": 48,
    "consoleErrorCount": 3,
    "interactiveElementCount": 24
  },
  "components": [
    {
      "id": "storefront",
      "label": "Storefront",
      "kind": "frontend",
      "health": "degraded",
      "confidence": "high",
      "telemetry": { "p95LatencyMs": 5200, "errorRatePct": 6.2 },
      "baseline": { "p95LatencyMs": 1300, "errorRatePct": 0.2 }
    },
    {
      "id": "checkout-api",
      "label": "Checkout API",
      "kind": "api",
      "health": "critical",
      "confidence": "high",
      "telemetry": { "p95LatencyMs": 6100, "errorRatePct": 14.8 },
      "baseline": { "p95LatencyMs": 620, "errorRatePct": 0.1 }
    }
  ],
  "evidence": [
    {
      "id": "E-CHECKOUT-TRACE",
      "kind": "trace",
      "summary": "Failed checkouts enter checkout-api and stall there.",
      "componentIds": ["storefront", "checkout-api"]
    }
  ],
  "dependencies": [
    {
      "from": "storefront",
      "to": "checkout-api",
      "confidence": "high",
      "evidenceIds": ["E-CHECKOUT-TRACE"]
    }
  ],
  "flows": [
    {
      "id": "checkout-confirmation",
      "label": "Checkout confirmation",
      "primaryPath": ["storefront", "checkout-api"],
      "branches": []
    }
  ],
  "changes": [],
  "diagnosis": {
    "summary": "The checkout API is the current failure lead.",
    "confidence": "medium",
    "evidenceIds": ["E-CHECKOUT-TRACE"],
    "componentIds": ["checkout-api"]
  },
  "webMcpTools": [],
  "candidateActions": [],
  "operatorHandoff": [
    "Escalate the evidence to the checkout service owner without changing the site."
  ]
}
```

## Optional action and recovery fields

When a matching target WebMCP tool exists, add a candidate with `targetComponentId`, exact `webMcp.toolName` and JSON `input`, risk, reversibility, expected telemetry, recovery time, and assumptions. Optional `recoveryThresholds` entries use `componentId`, a supported telemetry metric, `lte` or `gte`, and a numeric threshold.

The deterministic builder rejects duplicate IDs, unknown references, flow hops without a dependency edge, unobserved action tools, malformed telemetry, and measured-baseline claims without a baseline for every component.
