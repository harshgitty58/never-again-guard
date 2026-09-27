# IBM Bob Usage Statement

<!-- Plain text, paste-ready. Accurate to the Bob task screenshot: one Agent-mode task, 6/12 to-dos done.
     Not claimed (not done by Bob): /review, the custom mode, parallel subagents, Plan mode, the dashboard. -->

We used IBM Bob 2.0 in the IDE as the engine that built and ran the core of Never Again. It was one long Agent-mode task, driven by our build plan (plan.md) and our project rules (AGENTS.md). Bob turned the plan into its own 12-step to-do list and worked through it:

1. Demo app with real incident history. Bob built shoplite/, an Express + Vitest shop with three production-style bugs plus planted look-alike variants, committed with real git history and annotated tags (inc-101-bug / inc-101-fix and so on), keeping the app's own tests green at every tag. It pushed the scaffold to GitHub.

2. Postmortems. Bob wrote three realistic postmortems in postmortems/ with timelines, customer impact, 5-whys root causes and action items, including process-only ones.

3. Verifier CLI. Bob wrote guard/verify.mjs and its libraries: git worktree handling, a Vitest runner that parses JSON results and tells assertion failures from crashes, a Semgrep runner, anti-cheat checks and the report writer, with zero production dependencies.

4. Guards from documents. Reading each postmortem, Bob extracted the root cause, seed file and line, bug and fix refs, and action items, then wrote guards/INC-101, INC-102 and INC-103: guard.json, regression.test.js and a Semgrep rule.yml.

5. Run 1. Bob ran the verifier: all three incidents PARTIAL, with 7 open variants, saved to reports/history/run-1.

6. Variant fixes. Bob fixed all 7 variants in shoplite/src, then reran the app tests and the verifier: all three GUARDED, 0 open, saved to reports/history/run-2.

7. Reusable skill. Bob created the project skill never-again (.bob/skills/never-again/SKILL.md), which captures the postmortem-to-guard workflow for future incidents.

8. Debugging. When the verifier couldn't launch Semgrep on Windows, Bob traced the cause (the semgrep.exe wrapper needs its Scripts folder on PATH) and added fallback resolution in guard/lib/run-rule.mjs. When the INC-102 retry test hung, it was redesigned so the fake gateway caps the loop and the bug fails on an assertion in about 1 second.

Guardrails. Bob generates; a deterministic verifier judges. Bob worked under the AGENTS.md rules: never edit shoplite/src while writing a guard, quote the verifier's real verdict from reports/ instead of claiming success, fix the guard rather than the app when verification fails, and classify runbook and on-call items as process-only. Bob also wrote our conventional commit messages.

[DISCLOSURE — edit to taste: The 3D dashboard (dashboard/), the skill templates, the submission docs and one verifier cleanup fix were built with a separate AI coding assistant after our Bob budget ran out; those commits are marked in the git history.]

IBM watsonx.ai / watsonx Orchestrate. Not used in this build. We kept AI out of the judging step on purpose. On our roadmap, watsonx.ai (Granite) would extract postmortem fields in a GitHub Action for teams without Bob in the IDE, and watsonx Orchestrate would schedule and chase the process-only action items that code can't guard.

Cost. One Bob task, 39.26 Bobcoins of our 40-coin budget, about 177k tokens of context.
