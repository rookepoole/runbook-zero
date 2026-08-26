# Fresh-viewer acceptance test

Gate 7 passes only when a genuinely unfamiliar viewer answers at least four of five questions correctly after ten seconds with the public version 6 interface and no coaching.

## Reviewer requirements

The reviewer must not have previously seen Runbook Zero, its README, demo, screenshots, or judging materials. Use an alias rather than personal information in the public evidence receipt.

## Prepare the screen

1. Open <https://runbook-zero.rookepoole.chatgpt.site/> at approximately 1440×900 in a supported WebMCP client.
2. Select **Reset Scenario** and complete the canonical diagnosis and staging flow.
3. Stage `M-POOL-RESTORE` and click the visible **Approve staged mitigation** control.
4. Do **not** apply it. Confirm the interface says `HUMAN APPROVED`, the Capability Firewall says `AVAILABLE`, and unhealthy telemetry remains visible.
5. Put the live incident workspace in front of the reviewer. Do not explain the product, point, scroll, or interact while they inspect it.

The approved-but-not-applied state is required because it makes incident context, the recent change, mitigation status, and agent-versus-human provenance simultaneously testable.

## Ten-second test

Show the screen for exactly ten seconds, then hide it and ask these questions verbatim:

1. What service or user flow is in trouble?
2. How severe is it?
3. What changed recently?
4. Is a mitigation merely staged, human-approved, or already applied?
5. Which actions came from the agent versus the human?

Record each answer verbatim before giving feedback.

## Strict scoring key

Award one point for each answer that communicates the following without a leading follow-up:

1. Checkout, specifically the checkout-to-inventory-reservation path.
2. `SEV-2`.
3. The inventory deployment/configuration reduced the database pool from 80 to 12; `CHG-271` or `inventory-v2.7.0` strengthens but is not required.
4. Human-approved but not yet applied.
5. The agent investigated and staged the mitigation; the human performed approval. Equivalent wording is acceptable if authority is correctly separated.

The pass threshold is **4/5**. Ambiguous answers receive zero for that question. Do not reinterpret an answer after the reviewer sees the screen again.

## Evidence form

Copy this block, fill it from the observer's notes, and return it to the project owner. A passing result will be converted into the public Gate 7 evidence receipt.

```text
Reviewer alias:
Reviewer confirms no prior Runbook Zero exposure: yes / no
Test date and timezone:
Device, browser, and approximate viewport:
Screen state confirmed HUMAN APPROVED and not applied: yes / no

Q1 verbatim:
Q1 score: 0 / 1
Q2 verbatim:
Q2 score: 0 / 1
Q3 verbatim:
Q3 score: 0 / 1
Q4 verbatim:
Q4 score: 0 / 1
Q5 verbatim:
Q5 score: 0 / 1

Total: /5
No coaching during the ten-second view: yes / no
One optional sentence of reviewer feedback:
Observer alias:
```

After recording the result, select **Reset Scenario** so the public demo returns to clean `INC-042`.
