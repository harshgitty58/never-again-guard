---
name: never-again
description: Turn an incident postmortem into a verified regression guard (failing-then-passing test, variant-hunting Semgrep rule, action-item audit). Use when a postmortem or past incident is mentioned, or when the user wants to guard against a known bug recurring.
---
# Never Again

Turn an incident postmortem into a verified, machine-checked regression guard.

## Steps

1. **Parse the postmortem** using `templates/postmortem.md` as the expected shape.
   Extract and confirm: incident ID, root cause, trigger, seed file/function/line,
   bug git tag, fix git tag, action items (with type: test/rule/code/process).
   Ask if any field is missing or ambiguous before continuing.

2. **Fill `guards/<INC>/guard.json`** from `templates/guard.json`.
   - `bugRef` / `fixRef` must be real git tags in this repo.
   - Every code/test action item needs an `evidence` array (paths that will exist after the guard is written).
   - Process-only action items get `"status": "process-only"` and empty evidence.

3. **Write `guards/<INC>/regression.test.js`**.
   Rules:
   - Must have at least one `expect()`.
   - Must NOT use `.skip`, `.todo`, `.only`.
   - Must NOT `vi.mock()` the module under test.
   - Must NOT import from `guards/` (other than itself).
   - Must fail on `bugRef` with an **assertion** error (not a crash or module error).
   - Must pass on `fixRef`.
   - Make time/clients/externals injectable; no network; no real timers.
   - If the bug involves unbounded retries with 0ms delay (event-loop starvation),
     use a gateway that caps itself after N calls rather than Promise.race + setTimeout.

4. **Write `guards/<INC>/rule.yml`** (Semgrep YAML preferred).
   - Must match the seed file:line on `bugRef` (±2 lines tolerance).
   - Must NOT match the seed after `fixRef`.
   - Generalize from the *root cause pattern*, not the exact variable name.
   - If >50% of new matches are false positives, narrow the rule back.

5. **Run `npm run guard -- <INC>`** and report the real verdict from `reports/<INC>.json`.
   Never report from memory — always read the JSON file.
   If `FAILED`, fix the guard (not the app) and rerun, max 3 attempts, then stop and explain.

6. **Checklist before finishing**:
   - [ ] Anti-cheat passed (has-expect, no-skip, no-self-mock, no-guards-import)
   - [ ] Bug proof: test fails on `bugRef` with an assertion
   - [ ] Fix proof: test passes on `fixRef`
   - [ ] Rule seed matched on bug worktree
   - [ ] Rule seed clean on fix worktree
   - [ ] All evidence paths exist
   - [ ] App tests still green: `npm run test:app`

## Multi-incident usage

For multiple postmortems, spawn one subagent per incident in parallel (steps 1–5 each).
Only fix variants when explicitly asked. After fixing variants, rerun the verifier and the app tests.
Classify process-only action items honestly — do not invent code for them.
