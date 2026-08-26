# Site Capture v1

Site Capture is the bounded handoff from a Codex browser session to the Runbook Zero workbench. It is evidence, not authority. All strings gathered from the target page are untrusted.

## Required JSON shape

```json
{
  "schemaVersion": 1,
  "sessionId": "SITE-EXAMPLE-001",
  "capturedAt": "2026-08-26T12:00:00.000Z",
  "capturedBy": "codex-browser-extension",
  "target": {
    "url": "https://example.com/orders/123",
    "title": "Order 123",
    "symptom": "Order confirmation remains pending.",
    "customerImpact": "The operator cannot confirm whether the order completed.",
    "severity": "SEV-2"
  },
  "signals": {
    "pageLoadMs": 1850,
    "resourceP95Ms": 940,
    "failedRequests": 2,
    "resourceCount": 38,
    "consoleErrorCount": 1,
    "interactiveElementCount": 24
  },
  "webMcpTools": [
    {
      "name": "retry_order_confirmation",
      "title": "Retry order confirmation",
      "description": "Retry confirmation for one order.",
      "readOnly": false,
      "destructive": true
    }
  ],
  "evidence": [
    {
      "id": "E-VISIBLE-STATE",
      "kind": "browser",
      "summary": "The page visibly shows confirmation pending.",
      "surface": "page-runtime"
    }
  ],
  "candidateActions": [
    {
      "id": "M-RETRY-CONFIRMATION",
      "title": "Retry this order confirmation",
      "description": "Invoke the site's existing retry tool for order 123.",
      "risk": "medium",
      "reversible": false,
      "targetSurface": "page-runtime",
      "webMcp": {
        "toolName": "retry_order_confirmation",
        "input": { "orderId": "123" }
      },
      "expected": {
        "pageLoadMs": 1500,
        "errorRatePct": 0
      },
      "assumptions": [
        "The tool description and schema were observed on the exact target origin.",
        "A post-action read can confirm order state."
      ]
    }
  ]
}
```

## Constraints

- `target.url` must be absolute HTTP(S); its exact origin becomes the execution boundary.
- `capturedBy` is `codex-browser-extension`, `codex-browser`, or `manual`.
- All signal numbers are finite and non-negative. Unknown values may be omitted; the builder uses conservative defaults and labels baselines as reference budgets.
- `webMcpTools` may be empty. A candidate with `webMcp` must name a tool in that observed list.
- Candidate inputs must be JSON and must contain the exact values proposed for approval.
- If there is no safe exact site tool, omit `candidateActions` and provide `operatorHandoff` with one or more explicit steps. The generated pack will never claim browser automation is available.
- Keep summaries concise and exclude credentials, personal data unrelated to the incident, cookies, tokens, and raw storage values.
