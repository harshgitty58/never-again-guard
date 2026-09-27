# IBM Bob Usage Statement

<!--
  FILL BEFORE SUBMITTING. Keep every claim true; delete any line Bob didn't actually do.
  [TODO] markers need numbers or confirmation only you have (task numbers, Bobcoins, screenshots).
  Parts of this repo were written without Bob: the dashboard/ app, the skill templates and
  a worktree cleanup fix in guard/lib/git.mjs. Decide how to disclose those per the hackathon rules.
-->

We used IBM Bob 2.0 in the IDE both as the core of the product and as a builder.

**As the product engine.** A project-scoped skill, *never-again* (`.bob/skills/never-again/`), and a custom mode, *Postmortem Guard* [TODO: confirm the mode is saved at project scope, and commit it if it lives in `.bob/`], encode the workflow. Bob's document understanding reads each postmortem in `postmortems/` and extracts the root cause, trigger, seed file and line, bug and fix git refs, and action items. For each incident Bob wrote the regression test, the Semgrep rule and the `guard.json` manifest in `guards/INC-xxx/` [TODO: confirm "one subagent per incident, in parallel" — task 07]. After the first verifier run found 7 variants, Bob fixed all of them and reran the verifier until every incident was GUARDED (task 07b).

**As the builder.** `/init` generated `AGENTS.md`. Plan mode opened each phase before Agent mode implemented it: the shoplite demo app with real `inc-10x-bug` / `inc-10x-fix` git tags, the three postmortems, and the verifier CLI (`guard/`) with anti-cheat checks and worktree cleanup. [TODO: `/review` on `guard/` — number of findings fixed, task 05.] Bob also wrote the conventional commit messages. Auto-approve was scoped to read and edit, and every command execution was approved manually.

**Guardrails: Bob generates, a deterministic verifier judges.** The mode's instructions forbid editing application source while writing a guard. They also require Bob to quote the verifier's real verdict from `reports/INC-xxx.json` instead of claiming success, and to classify process-only action items honestly. When a guard failed verification, Bob had to fix the guard, not the app. For example, the INC-102 retry test first hung because an unbounded zero-delay retry loop never lets a timer fire. It was redesigned so the fake gateway itself caps the loop, which makes the bug fail on an assertion in about 1 s.

**Evidence.** [TODO: N] task session screenshots are in `bob_sessions/` (`neveragain_taskNN_*.png`). Total Bobcoin cost: [TODO: X].
