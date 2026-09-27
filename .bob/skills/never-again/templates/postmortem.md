# INC-XXX: <One-line title describing the customer-visible failure>

**Date:** YYYY-MM-DD · **Severity:** SEV-N · **Duration:** ~N hours (HH:MM–HH:MM TZ) · **Author:** <name (role)>

---

## Summary

<2–4 sentences: what customers saw, when, how many were affected, and the cost.>

---

## Customer Impact

| Metric | Value |
|---|---|
| <affected orders / requests> | <n> |
| <complaints / tickets> | <n> |
| <revenue / goodwill cost> | <amount> |

---

## Timeline (TZ, Day DD Mon YYYY)

| Time | Event |
|---|---|
| HH:MM | <first bad event> |
| HH:MM | <detection> |
| HH:MM | <root cause identified> |
| HH:MM | <mitigation / fix deployed> |

---

## Root Cause (5 Whys)

1. **Why** did <symptom> happen? — <answer>
2. **Why** …? — <answer>
3. **Why** …? — <answer>
4. **Why** …? — <answer>
5. **Why** …? — <answer: the systemic root cause>

**Seed location:** `<app>/src/<file>.js`, function `<name>()`, line <N>
**Bug ref:** `inc-xxx-bug` · **Fix ref:** `inc-xxx-fix`
**Trigger:** <the input or condition that exposes the bug, e.g. "order placed 00:00–05:29 IST">
**Pattern to generalize:** <the code shape that is wrong, e.g. "raw Date getters outside util/time.js">

---

## What Went Well

- <…>

## What Went Wrong

- <…>

---

## Action Items

Type must be one of: `test` · `rule` · `code` · `process`.
`process` items (runbooks, on-call, docs) are audited as `process-only` — never invent code evidence for them.

| ID | Action | Type | Owner | Due |
|---|---|---|---|---|
| AI-1 | Add a regression test that fails on `inc-xxx-bug` and passes on `inc-xxx-fix`. | test | <team> | +N days |
| AI-2 | Write a Semgrep rule for <pattern>; scan the repo and fix every match. | rule | <team> | +N days |
| AI-3 | Fix <variant files> to use <safe helper>. | code | <team> | +N days |
| AI-4 | <runbook / process change> | process | <team> | +N days |
