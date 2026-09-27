# Video Script — Never Again (target 2:50, hard limit 3:00)

Record at 1080p (OBS). You need at least 90 s of live solution footage; this script has about 125 s (0:30–2:35).
Before recording: `npm run guard -- --all` must be green, the dashboard must be deployed, and your Bob IDE must be open on the repo.

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:15 | Dashboard hero, **before** replay: amber cores, red shards, "7 open" | "Every team writes postmortems. The action items drift, and the same bug comes back, often in a different file." |
| 0:15–0:30 | `postmortems/INC-102-retry-storm.md`: root cause and action-item table | "Never Again turns a postmortem into a guard the code can't forget, and proves it." |
| 0:30–1:05 | Bob IDE: the Agent-mode task and its 12-step to-do list, then the files it wrote in `guards/INC-10x/` | "Bob reads the postmortem, pulls out the root cause, trigger and action items, and writes a regression test, a Semgrep rule and a guard manifest for each incident." |
| 1:05–1:40 | Terminal: `npm run guard -- --all`. Pause on `✗ bug (assertion) expected 10 to be less than or equal to 4` / `✓ fix` / `variants 2 open` | "We don't take the AI's word for it. An independent verifier checks out the buggy commit, and the test has to fail on an assertion. On the fix, it has to pass. Then the rule hunts for variants: seven more copies of the same mistakes, in files nobody touched during the incident." |
| 1:40–2:10 | Bob fixes the variants → rerun → **all GUARDED, exit 0** | "Bob fixes them. The verifier reruns: zero open variants, exit code zero." |
| 2:10–2:35 | Dashboard: click **Replay verification** (shards flip green, shields bloom) → scroll to the proof strip → variant map (toggle run 1 / run 2) → action-item audit | "The dashboard reads only the verifier's reports. You get proof per incident, the before-and-after of every variant, and which action items are really guarded and which are honestly process-only." |
| 2:35–2:50 | Bob features recap and numbers: 3/3 guarded · 7 → 0 variants · 11/11 code action items with evidence | "One Bob task built the app, the postmortems, the verifier and all three guards, then fixed every variant, for 39 Bobcoins." |
| 2:50–2:55 | Logo + dashboard URL + GitHub URL | "Never Again. Bob generates. The verifier judges." |

**Checklist before export:** length ≤ 3:00 · narration audible · Bob IDE usage clearly visible · the URL on the last frame is readable.
