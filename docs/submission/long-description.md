# Long Description — Problem & Solution

**Problem.** After every serious incident, teams write a postmortem with action items: add a test, check for similar code, update the runbook. Those items live in a document, drift, and are rarely closed. Incomplete follow-up makes the same incident far more likely to come back. Two gaps make it worse. First, even when someone says "we added a test", nothing proves that test would have caught the original bug. Second, the root-cause pattern almost always exists in other files, and nobody goes looking.

**Solution.** Never Again turns a postmortem into a guard the codebase can't forget, and proves it. With IBM Bob 2.0, a custom "Postmortem Guard" mode reads the postmortem (document understanding) and extracts the root cause, trigger, seed location and action items. For each incident it generates a regression test, a Semgrep rule generalized from the root cause, and a guard manifest that audits every action item.

Then an independent, deterministic verifier decides whether the guard is real. The AI does not. The verifier checks out the buggy commit in a throwaway git worktree and requires the test to fail *on an assertion* (crashes don't count). It checks out the fix and requires the test to pass. It confirms the rule matches the original bug and not the fix, then scans the whole app for variants: other files with the same mistake. Anti-cheat checks reject tests that are skipped, have no assertions, or mock the module under test. Bob fixes the variants, and the verifier reruns until the incident is GUARDED. Its exit code is 0 only when every incident is guarded.

**Results on our demo app** (three incidents modeled on real-world failures: a time-zone bug that promised midnight orders the wrong delivery date, an unbounded retry storm, and a null price that produced ₹NaN checkouts):

- All 3 regression tests are proven in both directions: they fail on an assertion at the bug commit and pass at the fix commit.
- **7 hidden variants** were found by the rules in the first run, and all 7 were fixed and proven closed in the second run.
- **11 of 11** code action items have file evidence. The 4 process-only items (runbooks, CI policy, docs) are labeled honestly, with no invented code evidence.
- A full verification of all three incidents takes under a minute.
- [TODO: Bob time per incident from task timestamps] of Bob time per incident, compared with an *estimated* 2–3 hours by hand (reproduce, write the test, grep for variants, fix, audit the action items).

**Impact.** Fewer repeat incidents. Postmortem follow-up takes minutes instead of sprints, and teams get evidence instead of claims. A 3D dashboard shows each incident's proof, the before-and-after variant map, and the action-item audit, all read from the verifier's JSON reports and never hand-edited. Next: a GitHub Action that runs the guard on every merged postmortem, plus importers for incident.io and Jira.
