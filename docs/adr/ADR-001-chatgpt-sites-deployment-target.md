# ADR-001 — Prefer ChatGPT Sites for the Challenge deployment

Status: Implemented
Date: 2026-08-25

## Evidence

- The project owner selected ChatGPT Sites as the desired Challenge deployment target.
- The official Challenge rules permit ChatGPT Sites, Cloudflare, Vercel, Render, Netlify, or any other provider; ChatGPT Sites is allowed but not mandatory.
- The frozen plan currently names Netlify or Vercel as the deployment shortlist, so changing the primary target requires an explicit record.

## Impact

Gate 8 deployed to ChatGPT Sites. The application remains a static Vite client behind a thin Cloudflare Worker-compatible asset entry point, so this does not change the domain, state machine, WebMCP tool contract, approval boundary, or Challenge-vs-commercial separation.

## Smallest replacement

Replace only the preferred hosting target:

```text
Primary: ChatGPT Sites
Fallback: another Challenge-allowed static host only if deployed-origin WebMCP compatibility, availability, or reproducibility cannot be established
```

No deployment work begins before the earlier canonical-workflow gates are complete.

## Outcome

- Public URL: `https://runbook-zero.rookepoole.chatgpt.site`
- Anonymous direct request: `200`, no sign-in redirect
- Real supported-browser WebMCP discovery and canonical J1–J4 journey: passed on the deployed origin

## Regression gates

- Replay Gate 1 discovery, invocation, structured output, and visible UI effect on the deployed origin.
- Run the complete Gate 8 fresh-session/reset/direct-link/browser-client checklist.
- Rerun the pre-submission typecheck, lint, test, build, and E2E suite against the frozen deployment candidate.
