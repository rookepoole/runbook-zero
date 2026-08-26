# Canonical demo script

Target: **2:20–2:40**. Hard stop: **2:55**.

Measured live rehearsal: **62.696 seconds** of deployed WebMCP tool/control time from reset through resolution note, leaving roughly 77–97 seconds inside the target window for prompt entry, narration, and readable holds.

The complete quoted narration and prompts contain **203 words**. At a clear 130–150 words per minute, speech takes approximately 81–94 seconds; combined with the measured interaction path, the unreduced run projects to roughly **2:24–2:37** before natural overlap.

## Before recording

- Open <https://runbook-zero.rookepoole.chatgpt.site> in the supported WebMCP client.
- Use a 1440×900 capture area and hide unrelated notifications.
- Select **Reset Scenario**.
- Confirm `INC-042`, `SEV-2`, `WebMCP Connected`, `9 tools active`, and no apply tool.
- Test microphone level and keep the timer off-screen.

## 0:00–0:15 — Thesis

Narration:

> Runbook Zero is a WebMCP-native incident command console where a browser agent and a human work on the same live operational surface. The page gives the agent structured tools while the human keeps context and control.

Show `INC-042`, the critical checkout path, and the WebMCP status.

## 0:15–0:55 — Diagnose

Prompt:

> Checkout latency spiked after this morning's deployment. Find the likely cause. Don't change production yet.

Expected chain: snapshot → checkout trace → inventory-db signals/config → recent changes → hypothesis.

Narration bridge:

> The agent traced checkout to inventory-db, found 97% saturation, and connected it to the v2.7.0 pool reduction from 80 to 12. Every call updates the same page I am looking at.

## 0:55–1:25 — Stage under constraint

Prompt:

> Don't roll back inventory. Show me the lowest-risk alternative and stage it for review.

Hold briefly on `STAGED — NOT APPLIED`, `M-POOL-RESTORE`, and the exact `12 → 80` change. Show that telemetry is still unhealthy and apply is absent.

Narration:

> The agent can prepare a precise change, but staging does not mutate the system and there is still no apply capability.

## 1:25–1:45 — Human authority

Click **Approve staged mitigation**.

Hold on `HUMAN APPROVED`, the human timeline event, and the changed active-tool surface.

Narration:

> Approval is deliberately human-only. Only after I approve this exact staged change does the page expose apply to the agent.

## 1:45–2:15 — Apply and verify

Prompt:

> Apply the approved mitigation and verify recovery.

Let all five deterministic recovery frames complete. Hold on `RESOLVED`, 420 ms P95, 0.8% errors, and 68% database saturation.

Narration:

> Apply disappears immediately after use. The shared topology, telemetry, and timeline recover through fixed frames, and the agent verifies every threshold.

## 2:15–2:35 — Close

Prompt:

> Add a note that we restored the inventory DB pool after the v2.7.0 regression.

Narration:

> WebMCP turns the page into a shared operational surface: the agent can investigate and act reliably, while the human keeps authority over consequential change.

End on the resolved workspace and completed Agent/Human/System timeline.

## Recording acceptance

- Total duration is under 3:00 with no sped-up unreadable sections.
- The final upload is publicly visible on YouTube and includes clear English audio.
- The address bar shows the public Sites origin at least once.
- `WebMCP Connected` and the active tool count are readable.
- The video visibly proves apply absent before approval and available after approval.
- The human click is visible; approval is never narrated as an agent action.
- Final metrics and the recovery note are readable.
- No console, private documents, credentials, notifications, or unrelated tabs appear.
- No copyrighted music or unlicensed third-party material is included.
