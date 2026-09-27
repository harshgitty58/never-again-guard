# NEVER AGAIN — Postmortem → Regression Guard
### IBM Bob 2.0 Hackathon build plan (hand this whole file to Bob IDE)

> **Tagline:** Every postmortem becomes a guard your code can't forget.
>
> **One-liner:** Drop an incident postmortem into Bob. *Never Again* turns it into (1) a regression test that is **proven** to fail on the buggy commit and pass on the fix, (2) a static rule that hunts down every **variant** of the same bug across the repo, and (3) an audit of the postmortem's action items showing which ones the code actually guards against now — all verified by an independent script, not by the AI's own claims.

---

## 0. READ THIS FIRST — time, deadline, ground rules

| | |
|---|---|
| **Now** | Sun 27 Sep 2026, ~10:30 IST |
| **Hard deadline** | **Sun 27 Sep 2026, 8:30 PM IST** (= 11:00 AM ET). Nothing is accepted after this. |
| **Our internal deadline** | **7:30 PM IST — form submitted.** The last hour is buffer only. Never submit in the last 10 minutes. |
| **Time available** | ~9 working hours. Every phase below has a hard stop. If a phase overruns, apply the **Cut List (§13)** — do not steal time from submission assets. |

### Instructions for Bob (IDE agent)
1. Read this entire file before doing anything. Then work **one phase at a time**, in order.
2. Start each phase in **Plan mode**, confirm the plan, then switch to **Agent mode** to implement. (This also shows judges the Plan → Agent workflow.)
3. Each numbered prompt in **§9** is **one Bob task**. Keep tasks separate — every task becomes one session-summary screenshot in `bob_sessions/`.
4. Prefer small, working, verified increments over big unverified ones. After every phase, run the tests and the verifier.
5. Never write secrets into the repo. Never claim something works unless a command's exit code proves it.
6. When a subagent is useful (independent, parallel work), use it — and say in the task summary that subagents ran in parallel.
7. The demo app is intentionally buggy at tagged commits. **Do not "fix" planted bugs outside the steps that tell you to.**

---

## 1. Hackathon rules & requirements — compliance checklist

Everything below is taken from the official lablab.ai event page and the IBM Bob 2.0 Hackathon Guide. Tick each one before submitting.

### Must-haves (disqualifying if missed)
- [ ] **Bob IDE is used** (required; Bob Shell optional). IDE version **v2.0.2 or later** (v1.0.3 / v2.0.0 stop working 30 Sep).
- [ ] Signed in with the **hackathon registration email** (IBMid) and team switched to the **`ibm-coding-challenge-uat` (us-east)** instance — not a personal account.
- [ ] **Public** GitHub repository.
- [ ] Repo contains the **code/files where Bob assisted**.
- [ ] Repo contains a folder named exactly **`bob_sessions/`** with **task session summary screenshots from EVERY team member** (PNG, named `<team>_task<NN>_<short_desc>.png`, e.g. `neveragain_task01_plan_architecture.png`).
- [ ] **Original work, MIT-compliant** → add an MIT `LICENSE` file.
- [ ] **Video: MP4, ≤ 3:00**, with **≥ 90 seconds showing the solution running on screen**, **narrated**, clearly showing **how Bob was used**.
- [ ] **Problem & Solution Statement (Long Description) ≤ 500 words.**
- [ ] **IBM Bob Usage Statement ≤ 500 words.**
- [ ] All submission form fields filled (list in §11).

### Should-haves (judging)
Judging = **Application of Technology** (complete, clear use of Bob 2.0) · **Presentation** · **Impact & Practical Value** · **Originality**.
The challenge explicitly asks to use **Agent mode, parallel tasks, subagents, and document understanding** to manage multiple steps — not just code assist. Our design uses all four on purpose (§6).

### After the event
- [ ] Complete the **post-hackathon feedback form** (20 participants get $100 for a qualified submission + feedback). Prize payout can take up to 90 days.

---

## 2. Phase timeline — what to build AND what to submit/commit at each phase

All times IST, Sunday 27 Sep.

| Phase | Time | Build | Evidence / submission actions at end of phase |
|---|---|---|---|
| **P0 Setup** | 10:30–11:00 | Repo, license, Bob config, `/init` AGENTS.md, tool checks | Repo **public** on GitHub. `LICENSE` (MIT), `bob_sessions/` folder, `.bobignore` committed. Screenshot task 01. Confirm IDE ≥ 2.0.2 + correct Bob instance. |
| **P1 Demo app + incidents** | 11:00–12:45 | `shoplite` app, 3 incidents with tagged bug/fix commits, 3 postmortems, planted variants | Tags `inc-101-bug/fix`, `inc-102-bug/fix`, `inc-103-bug/fix` pushed. Screenshots tasks 02–03. |
| **P2 Guard engine** | 12:45–15:00 | "Postmortem Guard" custom mode + `never-again` skill + independent verifier CLI; run on all 3 incidents (parallel subagents); fix variants | `guards/`, `reports/*.json` committed. Screenshots tasks 04–07. **Record rough screen captures of the Bob run now** (raw footage for the video — do not wait until the end). |
| **P3 Dashboard + deploy** | 15:00–17:00 | 3D dashboard reading real report JSON; deploy to Vercel | **Application URL live.** Screenshot tasks 08–09. Grab a 1280×720 screenshot for the cover image. |
| **P4 Submission assets** | 17:00–18:45 | README, statements, cover, slides (PDF), record + edit video | README final; `docs/submission/` has statements, slides PDF, cover PNG; video MP4 ≤ 3:00. Screenshot task 10 (+ each teammate's tasks). |
| **P5 Submit** | 18:45–19:30 | Fill lablab form, upload video/slides/cover, final checks (§12) | **SUBMITTED by 19:30.** |
| Buffer | 19:30–20:30 | Fix only what's broken. No new features. | Deadline 20:30. |

**Team split (if >1 person):** A = demo app + guard engine (P1–P2) · B = dashboard (starts P3 work at 12:45 on mock JSON using the schema in §7.3) · C = video script, slides, statements (starts drafting at 13:00). **Every member must run at least one real Bob task and screenshot it.**

---

## 3. The problem (for pitch, README, statements)

- Teams write postmortems after every serious incident. The **action items** ("add a test", "add a lint check", "audit other callers") live in a document, drift, and are rarely closed. Google's SRE workbook states plainly that incomplete action items make recurrence far more likely.
- Even when the fix ships, **the same root-cause pattern usually exists elsewhere** in the codebase — nobody goes looking.
- Nothing proves a guard exists: "we added a test" is a claim, not evidence. A test that also passes on the buggy code guards nothing.

**Workflow improved:** debugging → application maintenance (incident follow-up). **Pain:** hours of manual follow-up per incident, repeat incidents, unverifiable claims.

## 4. The solution

For each postmortem, *Never Again* produces and **independently verifies**:

1. **Regression test** — must **FAIL on the bug commit (on an assertion, not a crash)** and **PASS on the fix commit**. Same proof standard used by bug-reproduction research (LIBRO): execute on both buggy and fixed versions.
2. **Variant rule** — a Semgrep (or ESLint) rule generalized from the root cause. Must match the original bug location on the bug commit, must not match it on the fix commit, then scans HEAD for **variants** (other places with the same mistake).
3. **Variant fixes** — Bob fixes the variants; the verifier re-runs until open variants = 0.
4. **Action-item audit** — every action item from the postmortem is classified `guarded / partial / unguarded / process-only` with file evidence.
5. **Verdict** — `GUARDED / PARTIAL / FAILED` per incident, written to JSON and shown on the dashboard.

**The key design principle:** Bob *generates*; a deterministic verifier *judges*. The AI never grades its own homework.

---

## 5. Tech stack & repo structure

- **Runtime:** Node.js 20+ (ESM), npm.
- **Demo app:** Express (only for realism; logic lives in pure functions) + **Vitest** for tests.
- **Variant rules:** **Semgrep** (`pip install semgrep`; check `semgrep --version` in P0). **Fallback if Semgrep won't run on your OS:** ESLint flat config with a local plugin / `no-restricted-syntax` selectors. The verifier supports both via `rule.engine`.
- **Verifier:** plain Node script, **no extra deps** (uses `child_process`, `fs`, git worktrees).
- **Dashboard:** Vite + React + TypeScript + **three.js via @react-three/fiber + @react-three/drei + @react-three/postprocessing**, Framer Motion for UI motion. Static build → **Vercel**.

```
never-again/
├─ LICENSE                      # MIT
├─ README.md
├─ AGENTS.md                    # generated by Bob /init, then edited
├─ .bobignore                   # .env, secrets/, *.key
├─ .bob/
│  ├─ skills/never-again/SKILL.md
│  │                            # + templates/postmortem.md, templates/guard.json
│  └─ (custom mode saved here via Settings → Modes, project scope)
├─ bob_sessions/                # ALL members' task summary screenshots (PNG)
├─ shoplite/                    # the demo app (has its own package.json)
│  ├─ src/ (delivery.js, loyalty.js, reports/daily.js, clients/*.js, pricing/*.js, util/*)
│  ├─ test/                     # the app's normal tests (green at every tag)
│  └─ vitest.config.js          # sets process.env.TZ = 'UTC' (simulates prod server)
├─ postmortems/
│  ├─ INC-101-midnight-orders.md
│  ├─ INC-102-retry-storm.md
│  └─ INC-103-rupee-nan-checkout.md
├─ guards/
│  └─ INC-10x/ guard.json · regression.test.js · rule.yml (or rule.eslint.js)
├─ guard/                       # the verifier CLI
│  ├─ verify.mjs
│  └─ lib/ (git.mjs, run-test.mjs, run-rule.mjs, anticheat.mjs, report.mjs)
├─ reports/                     # verifier output: INC-10x.json + summary.json
├─ dashboard/                   # Vite React app; public/reports/ synced from /reports
└─ docs/
   ├─ submission/ (long-description.md, bob-usage-statement.md, slides.pdf, cover.png, video-script.md)
   └─ architecture.md
```

Root `package.json` scripts:
- `guard` → `node guard/verify.mjs` (args: `--all` or `INC-101`)
- `sync-reports` → copy `reports/*.json` to `dashboard/public/reports/`
- `test:app` → run shoplite tests

---

## 6. How Bob 2.0 features map to the product (the judging story)

| Bob feature | Where it's used | What judges see |
|---|---|---|
| **Document understanding** | Reads the postmortem markdown/PDF: extracts root cause, trigger, affected code, action items | Postmortem in → structured `guard.json` out |
| **Plan mode** | Every phase starts with a plan; the Postmortem Guard mode plans before writing | Plan shown before code |
| **Agent mode** | Writes tests, rules, verifier, dashboard, variant fixes | Real edits, real commands |
| **Custom mode** — "Postmortem Guard" | Encodes the whole workflow + guardrails (never edit `src/` during test generation, always run the verifier) | A reusable, shareable persona in `.bob/` |
| **Skill** — `never-again` | Reusable instruction set + templates (postmortem template, guard.json schema) | `/never-again` invocation |
| **Subagents / parallel tasks** | One subagent per incident (3 in parallel), or per artifact (test writer / rule writer / action-item auditor) | Parallel subagents panel in the video |
| **/review** (built-in code review) | Review the verifier before trusting it | Findings addressed |
| **/init → AGENTS.md** | Persistent project context | File in repo |
| **Commit messages / PR generation** | Conventional commits for each phase | Git history |
| **Rollback / checkpoints** | Safe experimentation while generalizing rules | Mention in usage statement |
| **Auto-approve (scoped)** | Read + Edit only; Execute stays manual | Security-aware usage |

---

## 7. Detailed specs

### 7.1 Demo app `shoplite` — 3 incidents

Build the app **incrementally** so each incident has a real bug commit and a real fix commit. Git flow per incident:
1. Commit the feature **with the bug** → `git tag inc-10x-bug`
2. Commit the **minimal fix at the seed location only** → `git tag inc-10x-fix`
3. The **variants** (same mistake elsewhere) are committed as part of normal feature work and **left unfixed** — the tool must find them.

Make all business logic pure and injectable (pass `now`, pass clients) so tests are deterministic. `vitest.config.js` sets `process.env.TZ = 'UTC'` to simulate the production server's clock.

**INC-101 — "Midnight Orders" (time zone)**
- Feature: `promisedDeliveryDate(now)` in `src/delivery.js`. Orders before 2 PM IST ship same day, else next day.
- Bug: uses `now.getHours()` / `now.getDate()` (server local = UTC) instead of IST. Orders placed 00:00–05:30 IST are promised the wrong date.
- Fix: use `toIST(now)` helper from `src/util/time.js` at the seed location.
- Planted variants (unfixed): `src/loyalty.js` birthday-discount check uses `new Date().getDate()`; `src/reports/daily.js` groups sales by `getDay()`.
- Rule idea: flag `$D.getHours()|getDate()|getDay()|getMonth()` on Date objects outside `util/time.js`.

**INC-102 — "Retry Storm" (unbounded retries)**
- Feature: `src/clients/payment.js` calls gateway via `withRetry(fn)` from `src/util/retry.js`.
- Bug: `withRetry(fn)` default = infinite attempts, 0 ms delay → hammered the gateway during an outage.
- Fix: payment client calls `withRetry(fn, { maxAttempts: 4, backoffMs: 200, jitter: true })`.
- Planted variants: `src/clients/inventory.js` and `src/clients/sms.js` still call `withRetry(fn)` with no options.
- Test: fake gateway that always fails + fake timers; assert call count ≤ 4 and delays increase.
- Rule idea: `withRetry($F)` with exactly one argument.

**INC-103 — "₹NaN Checkout" (null from upstream API)**
- Feature: `src/pricing/lineTotal.js` computes `item.price * qty`.
- Bug: inventory API returns `price: null` for discontinued SKUs → `NaN` → customers saw "₹NaN" and orders with ₹0 were accepted.
- Fix: `toMoney(item.price)` guard that throws `PriceUnavailableError`.
- Planted variants: `src/pricing/cartTotal.js` (sum of `.price`) and `src/invoice.js` (tax on `.price`).
- Rule idea: arithmetic (`*`, `+`, `-`) directly on `$X.price` outside `util/money.js`.

The app's own `test/` suite must stay green at every tag (the bug escaped because tests didn't cover it — realistic).

### 7.2 Postmortems (the input documents)

Write 3 realistic blameless postmortems (~1 page each) in `postmortems/`, using this template (also saved in the skill):

```
# INC-10x: <title>
Date · Severity (SEV-1/2) · Duration · Author
## Summary
## Customer impact (numbers: orders affected, ₹ at risk, minutes of downtime)
## Timeline (IST)
## Root cause (5 whys; name the file/function)
## Trigger
## What went well / what went wrong
## Action items
| ID | Action | Type (test/rule/config/process) | Owner | Due |
```
Each postmortem should have 4–5 action items, mixing: a test item, a "find other occurrences" item, a config/code item, and at least one pure **process** item (e.g., "update on-call runbook") — so the audit shows `process-only` honestly instead of pretending code can guard everything.

Optional: export one postmortem to **PDF** too, to show Bob's document understanding on a non-code file.

### 7.3 Verifier CLI — `guard/verify.mjs`

**Input:** `guards/INC-10x/guard.json`
```json
{
  "incident": "INC-101",
  "title": "Midnight orders promised the wrong delivery date",
  "postmortem": "postmortems/INC-101-midnight-orders.md",
  "app": "shoplite",
  "bugRef": "inc-101-bug",
  "fixRef": "inc-101-fix",
  "test": "guards/INC-101/regression.test.js",
  "rule": { "engine": "semgrep", "path": "guards/INC-101/rule.yml",
            "seed": { "file": "shoplite/src/delivery.js", "line": 12 } },
  "actionItems": [
    { "id": "AI-1", "text": "Add a regression test for orders placed after midnight IST",
      "type": "test", "status": "guarded", "evidence": ["guards/INC-101/regression.test.js"] }
  ]
}
```

**Algorithm (per incident):**
1. **Anti-cheat on the test file:** ≥1 `expect(`; no `.skip`, `.only`, `.todo`; does not `vi.mock` the module under test; does not import from `guards/` other than itself. Any violation → `FAILED`.
2. **Bug proof:** `git worktree add --detach .guard-tmp/bug <bugRef>`; link `node_modules` from the main checkout (use a **junction** on Windows: `fs.symlinkSync(src, dst, 'junction')`); copy the test in; run `npx vitest run <test> --reporter=json`. Expect **exit ≠ 0 AND the failure is an assertion** (JSON result shows a failed assertion, not a module/syntax error).
3. **Fix proof:** same at `<fixRef>`; expect **exit 0**.
4. **Rule sanity:** run the rule on the bug worktree → must match `seed.file:seed.line` (±2 lines). Run on the fix worktree → must **not** match the seed.
5. **Variant hunt:** run the rule on current HEAD `shoplite/src` → list every match as a variant `{file, line, snippet}`.
6. **Action items:** check every `evidence` path exists; recompute status.
7. **Verdict:** `GUARDED` if 1–4 pass AND 0 variants; `PARTIAL` if 1–4 pass but variants remain or any code action item is unguarded; `FAILED` otherwise.
8. Clean up worktrees (always, even on error). Record durations.

**Output:** `reports/INC-10x.json` and `reports/summary.json`:
```json
{
  "incident": "INC-101", "title": "...", "verdict": "PARTIAL",
  "proof": {
    "bug": { "exit": 1, "failedOn": "assertion", "ms": 812, "excerpt": "expected '2026-09-28' to be '2026-09-27'" },
    "fix": { "exit": 0, "ms": 790 }
  },
  "rule": { "engine": "semgrep", "seedMatchedOnBug": true, "seedCleanOnFix": true,
            "variants": [ { "file": "shoplite/src/loyalty.js", "line": 8, "snippet": "...", "status": "open" } ] },
  "actionItems": [ { "id": "AI-1", "status": "guarded", "evidence": ["..."] } ],
  "anticheat": { "passed": true, "checks": ["has-expect", "no-skip", "no-self-mock"] },
  "timings": { "totalMs": 5321 },
  "generatedAt": "2026-09-27T09:45:00Z"
}
```
Terminal output: colored per-incident lines, e.g. `INC-101  ✗ bug (assertion)  ✓ fix  rule ✓  variants 2 open  → PARTIAL`. Exit code 0 only if all incidents are `GUARDED`.

**Demo arc:** first run → all `PARTIAL` with **6 open variants** (2 per incident). Bob fixes the variants → rerun → all `GUARDED`, **0 open variants**. Save both runs' reports (`reports/history/run-1/`, `run-2/`) so the dashboard can show the before/after.

### 7.4 Custom mode — "Postmortem Guard"

Create via **Bob Settings → Modes → +**, scope = **this project** (so it's saved in the repo and visible to judges). If editing files directly, follow the schema in Bob docs: https://bob.ibm.com/docs/ide/configuration/custom-modes

- **Name:** Postmortem Guard · **Slug:** `postmortem-guard`
- **Role definition:** "You are a reliability engineer. You turn incident postmortems into verified regression guards. You never trust a guard until the verifier proves it."
- **When to use:** "When given an incident postmortem, or asked to guard against a past incident recurring."
- **Tool access:** read, edit, command. **Allowed subagents:** allow general-purpose subagents (for per-incident parallel work).
- **Custom instructions:**
  1. Read the postmortem fully. Extract: root cause, trigger, seed file/function, bug/fix refs, action items. Ask if any is missing.
  2. Plan first. Then write `guards/<INC>/guard.json`, `regression.test.js`, and the rule.
  3. While writing the test and the rule, **never edit application source**.
  4. Generalize the rule from the *root cause*, not the exact line. Start exact, then widen; if more than half the new matches are false positives, narrow it back.
  5. Always run `npm run guard -- <INC>` and report the real verdict. If `FAILED`, fix the guard (not the app) and rerun, max 3 attempts, then stop and report.
  6. For multiple postmortems, spawn one subagent per incident in parallel.
  7. Only fix variants when explicitly asked; after fixing, rerun the verifier and the app test suite.
  8. Classify process-only action items honestly — do not invent code for them.

### 7.5 Skill — `.bob/skills/never-again/SKILL.md`

Create via **Bob Settings → Skills → +**, scope = project (saves to `.bob/skills/`). Content:

```markdown
---
name: never-again
description: Turn an incident postmortem into a verified regression guard (failing-then-passing test, variant-hunting rule, action-item audit). Use when a postmortem or past incident is mentioned.
---
# Never Again
1. Parse the postmortem with templates/postmortem.md as the expected shape.
2. Fill templates/guard.json for the incident.
3. Write the regression test: it must fail on bugRef on an assertion and pass on fixRef. Inject time/clients; no network; no mocking the module under test.
4. Write the variant rule (Semgrep YAML preferred). It must match the seed on bugRef and not on fixRef.
5. Run `npm run guard -- <INC>`; report the verdict, variants, and action-item statuses from reports/<INC>.json — never from memory.
6. Checklist before finishing: anti-cheat passed · proof both ways · rule sanity both ways · evidence paths exist.
```
Add `templates/postmortem.md` (template from §7.2) and `templates/guard.json` (schema from §7.3) next to it.

### 7.6 Dashboard — professional + eye-catching 3D

**Goal:** within 5 seconds a judge understands "incidents were unguarded → now proven guarded". Real data only — it reads `public/reports/*.json`.

**Look & feel:** dark "incident command" aesthetic, precise and calm, not neon-gaming.
- Colors (CSS tokens): background `#07090D`, surface `#0E1218`, border `#1C2330`, text `#E6EAF2`, muted `#8A94A6`, **unguarded red `#FF4D5E`**, **partial amber `#FFB547`**, **guarded green `#2BD99F`**, accent (Bob / IBM blue) `#4589FF`.
- Type: **Inter** (UI), **Space Grotesk** (headings), **JetBrains Mono** (code/terminal) from Google Fonts.
- 8px spacing grid, 12px radius cards, 1px borders, subtle glass blur only on the hero overlay.
- Light theme not required; add `prefers-reduced-motion` support.

**Sections:**
1. **Hero — "Incident Constellation" (3D, react-three-fiber):**
   - Each incident is a slowly rotating faceted **icosahedron core** (emissive color = verdict).
   - Its **variants** orbit it as small crystalline shards (red = open, green = fixed).
   - A `GUARDED` incident gets a translucent **fresnel shield sphere** that fades in around it.
   - A **"Replay verification"** button animates run-1 → run-2: shards snap from red to green one by one, shields bloom on (`@react-three/postprocessing` Bloom, subtle), a counter ticks "6 open variants → 0".
   - Soft star-dust particles + slow camera drift; mouse parallax. Hover a core → label; click → scrolls to that incident.
   - Performance: cap DPR at 1.5, lazy-load the canvas, show a static SVG fallback when reduced motion is on or WebGL is unavailable.
   - Overlay copy: headline "Every postmortem becomes a guard your code can't forget." + 3 KPI chips (incidents guarded, variants fixed, action items with evidence).
2. **Proof strip (per incident):** two terminal-style cards side by side — **bug commit ✗ (assertion excerpt, red)** and **fix commit ✓ (green)** — with the durations from the report. This is the "don't trust, verify" moment.
3. **Variant map:** table of file:line + code snippet with status chips (open/fixed); toggle run-1 / run-2.
4. **Action-item audit:** the postmortem's action items with `guarded / partial / unguarded / process-only` chips + evidence links to GitHub files.
5. **How it works:** 5-step horizontal flow (Postmortem → Bob reads → Guard generated → Verifier proves → Variants fixed), with Bob features labeled on each step.
6. **Run it yourself:** copyable commands + GitHub link. Footer: "Built with IBM Bob 2.0 · MIT".

**Deploy:** Vercel, framework preset Vite, root `dashboard/`. The Vercel URL is the **Application URL**; platform = **Web**.

---

## 8. Metrics to capture (for impact claims — keep them honest)

Record during P2, put in README + dashboard + video:
- Bob time per incident (from task timestamps) vs. a **clearly labeled manual estimate** (e.g., "est. 2–3 h manual: reproduce, write test, grep for variants, fix, audit action items").
- Variants found (expect 6) and fixed.
- Action items: how many now have code evidence vs. process-only.
- Verifier run time.
- Bobcoin cost per incident (from the session summary API cost) — shows efficiency.
Never present an estimate as a measurement.

---

## 9. Bob task sequence (one prompt = one task = one screenshot)

Take the screenshot of each task's **session summary** right after it finishes (Tasks list → open task → click task header → screenshot). Save it to `bob_sessions/` as `neveragain_taskNN_<desc>.png`.

| # | Mode | Prompt to give Bob (short form) | Phase |
|---|---|---|---|
| 01 | Plan → Agent | "Read plan.md. Scaffold the repo per §5: root package.json scripts, MIT LICENSE, .bobignore, bob_sessions/, empty folders. Run /init to create AGENTS.md summarizing this project." | P0 |
| 02 | Plan → Agent | "Build shoplite per §7.1 incident by incident with real git commits and tags inc-10x-bug / inc-10x-fix. Plant the variants. Keep the app's own tests green at every tag. Show `git log --oneline --decorate` at the end." | P1 |
| 03 | Agent | "Write the 3 postmortems per §7.2 with realistic numbers and 4–5 action items each, including process-only ones." | P1 |
| 04 | Plan → Agent | "Build the verifier CLI per §7.3 exactly, including anti-cheat and worktree cleanup. Test it against a deliberately bad test (one that passes on the bug) and show it returns FAILED." | P2 |
| 05 | Agent | "/review the guard/ folder and fix every real finding." | P2 |
| 06 | Agent | "Create the Postmortem Guard custom mode (§7.4) and the never-again skill (§7.5) at project scope." | P2 |
| 07 | **Postmortem Guard** | "Here are 3 postmortems: @postmortems/. Guard all of them — one subagent per incident in parallel. Then run `npm run guard -- --all` and report. Save reports to reports/history/run-1/." ← **record this on screen** | P2 |
| 07b | **Postmortem Guard** | "Fix all open variants found in run-1. Rerun the app tests and `npm run guard -- --all`. Save to reports/history/run-2/." ← **record this on screen** | P2 |
| 08 | Plan → Agent | "Build the dashboard per §7.6 reading real reports. Make it look like a premium product." | P3 |
| 09 | Agent | "Polish: performance (DPR cap, lazy canvas), reduced-motion fallback, mobile layout, meta tags/OG image. Build and fix all errors." | P3 |
| 10 | Agent | "Write README.md (hero image, problem, solution, architecture diagram in Mermaid, quickstart, Bob usage, results table from reports, license) and docs/submission/* drafts per §11." | P4 |

Teammates: each runs at least one of these (or a sub-part) from **their own** hackathon Bob account and screenshots it.

---

## 10. Video — ≤ 3:00, narrated, ≥ 90 s of live solution

Record with OBS at 1080p. Target **2:50**. Script (`docs/submission/video-script.md`):

| Time | Visual | Narration (gist) |
|---|---|---|
| 0:00–0:15 | Dashboard hero, red constellation | "Every team writes postmortems. The action items drift, and the same bug comes back — often in a different file." |
| 0:15–0:30 | Postmortem doc on screen | "Never Again turns a postmortem into a guard the code can't forget — and proves it." |
| 0:30–1:05 | Bob IDE: Postmortem Guard mode, Plan, **3 subagents in parallel** | "Bob reads the postmortem — root cause, trigger, action items — and spawns a subagent per incident." |
| 1:05–1:40 | Terminal: verifier output — ✗ bug (assertion) / ✓ fix, rule finds variants | "We don't trust the AI's word. An independent verifier checks the test fails on the buggy commit and passes on the fix, then the rule hunts variants: six more copies of the same mistake." |
| 1:40–2:10 | Bob fixes variants → rerun → all GUARDED | "Bob fixes them; the verifier reruns: zero open variants." |
| 2:10–2:35 | Dashboard: Replay verification animation, proof strip, action-item audit | "The dashboard shows proof per incident and which action items are truly guarded — and which are process-only." |
| 2:35–2:50 | Bob features recap + impact numbers | "Document understanding, custom mode, skill, parallel subagents, /review. X minutes per incident instead of hours." |
| 2:50–2:55 | Logo + URL | "Never Again." |

Live footage (0:30–2:35) ≈ 125 s → satisfies the ≥90 s rule. Check final length ≤ 3:00 before exporting MP4.

## 10b. Slides (PDF, 8 slides)
1. Title + tagline · 2. Problem (postmortem action items drift; repeat incidents) · 3. Insight: prove, don't claim · 4. Solution (4 outputs) · 5. Architecture + Bob features map (§6 table as a diagram) · 6. Proof: screenshot of bug ✗ / fix ✓ + variants 6 → 0 · 7. Impact metrics (§8) · 8. Roadmap (GitHub Action on every merged postmortem PR, incident.io/Jira import, watsonx Orchestrate to schedule action-item follow-ups, multi-language rules) + team.

## 10c. Cover image
1280×720 PNG: the green constellation screenshot + "NEVER AGAIN" + tagline + small "Built with IBM Bob 2.0". Save as `docs/submission/cover.png`.

---

## 11. Submission form — field-by-field

| Field | What to put | Ready by |
|---|---|---|
| Title | Never Again — Postmortem → Regression Guard | P4 |
| Short Description | "Turns incident postmortems into proven regression tests, variant-hunting rules and an action-item audit — built with IBM Bob 2.0." | P4 |
| Long Description (**Problem & Solution, ≤500 words**) | `docs/submission/long-description.md` — draft below | P4 |
| IBM Bob Usage Statement (**≤500 words**) | `docs/submission/bob-usage-statement.md` — template below | P4 |
| Technology & Category tags | IBM, IBM Bob (if listed), Vercel; categories: Developer Tools, Testing, DevOps/SRE | P5 |
| Public Code Repository | GitHub URL (public!) | P0 |
| Bob Task Session Summary Screenshots | in repo `bob_sessions/` (+ upload in form if it asks) | ongoing |
| Demo Application Platform | Web (Vercel) | P3 |
| Application URL | Vercel URL | P3 |
| Cover Image | `docs/submission/cover.png` | P4 |
| Video Demonstration | MP4 ≤ 3:00 | P4 |
| Slide Presentation | `docs/submission/slides.pdf` | P4 |

### Long description — draft (~330 words; update numbers from real runs)
> **Problem.** After every serious incident, teams write a postmortem with action items: add a test, check for similar code, fix the config. Those items live in a document, drift, and are rarely closed — and incomplete action items make the same incident far more likely to return. Worse, the root-cause pattern usually exists in other files too, and nobody goes looking. Even when someone says "we added a test", nothing proves that test would actually have caught the bug.
>
> **Solution.** Never Again turns a postmortem into a guard the codebase can't forget. Using IBM Bob 2.0, a custom "Postmortem Guard" mode reads the postmortem (document understanding), extracts the root cause, trigger and action items, and — with one subagent per incident running in parallel — generates three artifacts: a regression test, a static rule generalized from the root cause, and an action-item audit.
>
> Then an independent verifier, not the AI, decides whether the guard is real. It checks out the buggy commit and requires the test to fail on an assertion; checks out the fix and requires it to pass; confirms the rule matches the original bug and not the fix; and scans the repo for variants. Anti-cheat checks reject skipped, empty or self-mocking tests. Bob then fixes the variants and the verifier reruns until the incident is GUARDED.
>
> **Results on our demo app (3 real-world-style incidents: a time-zone bug, a retry storm, and a null price causing ₹NaN checkouts):** all 3 regression tests proven on bug and fix commits, [6] hidden variants found and fixed, [X of Y] action items now backed by code evidence, [N] minutes of Bob time per incident versus an estimated 2–3 hours by hand.
>
> **Impact.** Fewer repeat incidents, postmortem follow-up that takes minutes instead of sprints, and evidence instead of claims. A dashboard visualizes every incident's proof, variants and action items. Next: a GitHub Action that runs on every merged postmortem.

### Bob usage statement — template (fill with real task numbers)
> We used IBM Bob 2.0 in the IDE as both builder and the core of the product.
> **As the product engine:** a project-scoped custom mode, *Postmortem Guard*, and a reusable skill, *never-again* (both in `.bob/`), encode the workflow. Bob's document understanding reads postmortems; the mode spawns **parallel subagents**, one per incident, each writing a regression test, a Semgrep rule and a guard manifest; Bob then fixes the variants the verifier found (task 07/07b).
> **As the builder:** Plan mode for every phase, Agent mode for implementation, `/init` for AGENTS.md, `/review` on the verifier (N findings fixed, task 05), commit-message generation, scoped auto-approve (read/edit only; execute approved manually), rollback checkpoints while widening rules.
> **Guardrails:** Bob generates, a deterministic verifier judges — the mode instructions forbid editing app source while writing guards and require reporting the verifier's real verdict.
> **Evidence:** [N] task session screenshots from every member in `bob_sessions/`; files Bob created are listed in README → "Bob-assisted files". Total Bobcoin cost: [X].

---

## 12. Final pre-submit checklist (run at 18:45)

- [ ] Repo **public**; open it in an incognito window to confirm.
- [ ] `LICENSE` is MIT; README complete; no secrets committed (`git log -p | grep -i key` sanity check).
- [ ] `bob_sessions/` has screenshots from **every** member, PNG, clear names.
- [ ] `npm run guard -- --all` → all GUARDED on a fresh clone (`git clone … && npm ci && npm run guard -- --all`).
- [ ] Application URL loads on phone + desktop; 3D works; fallback works.
- [ ] Video MP4 ≤ 3:00, ≥ 90 s live demo, narrated, Bob usage visible.
- [ ] Long description ≤ 500 words; Bob usage statement ≤ 500 words (check with a word counter).
- [ ] Cover image, slides PDF ready.
- [ ] Every form field filled; submitted **by 19:30 IST**; screenshot the confirmation.
- [ ] Tomorrow: post-hackathon feedback form.

---

## 13. Cut list (apply in this order if behind schedule)

1. Drop the PDF postmortem; markdown only.
2. Drop INC-103; ship 2 incidents (4 variants).
3. Replace postprocessing Bloom with emissive materials only.
4. Drop the Semgrep path; ESLint `no-restricted-syntax` only.
5. Replace the 3D hero with a 2D SVG constellation (keep the red → green replay animation).
6. **Never cut:** the bug ✗ / fix ✓ proof, `bob_sessions/`, public repo, video, statements, deployed URL.

---

## 14. Research notes — prior art & how we differ

- **LIBRO (ICSE 2023, KAIST)** — LLM generates bug-reproducing tests from bug reports and validates them by running on buggy and fixed versions; reproduced about a third of Defects4J bugs. *Takeaway:* generated tests are often wrong → we verify both directions and add anti-cheat checks. https://arxiv.org/abs/2209.11515
- **Variant analysis (Semgrep / CodeQL, Trail of Bits skills)** — security teams use one known bug as a seed to find similar code; start with an exact match, then generalize; if more than ~50% of new matches are false positives, back off. *Takeaway:* we bring variant analysis from security to **reliability incidents** and use their generalization rule in our mode instructions. https://docs.semgrep.dev/faq/comparisons/codeql · https://playbooks.com/skills/trailofbits/skills/variant-analysis
- **Postmortem practice (Google SRE workbook, incident.io)** — incomplete action items make recurrence more likely; action items should be tracked to completion. Incident platforms track action items as tickets, but **none prove the code guard exists**. That's our gap. https://sre.google/workbook/postmortem-culture/ · https://incident.io/blog/why-do-post-mortem-action-items-fail-how-to-make-incident-follow-ups-actually-get-done
- **Closest hackathon entry — "Bob Reliability Engineer" (BRE)** — incident → diagnose → approve → remediate → verify loop with a learning memory; its README states its Bob calls are simulated stand-ins. *We differ:* we start **after** the fix, from the postmortem document, and focus on **prevention** (proven regression guard + variant hunt + action-item audit), with **real, live Bob usage** in the IDE as the engine. https://github.com/mohith1306/ReliabilityEngineer
- **Gallery projects in the "green but lying" family** (Witnessed, uncaught, MergeWitness, PackProof) show judges respond to *proof over claims* — our bug ✗ / fix ✓ proof sits in that lane, applied to a workflow none of them covers.
- **Bob docs used:** skills live in `.bob/skills/`, custom modes are managed per workspace in Settings → Modes, and modes can restrict which subagents they allow. https://bob.ibm.com/docs/ide/changelog · https://bob.ibm.com/docs/ide/features/subagents · https://bob.ibm.com/docs/ide/tutorials/use-skills
