# Architecture — Never Again

> Phase P0 · 2026-09-27

## Overview

Never Again is a pipeline that converts a plaintext incident postmortem into a **cryptographically-honest regression guard**. The AI generates; a deterministic verifier judges.

```
Postmortem (markdown)
        │
        ▼
┌───────────────────────┐
│  Bob — Postmortem     │  Document understanding: extracts root cause,
│  Guard custom mode    │  trigger, seed file/function, action items
│  + never-again skill  │
└──────────┬────────────┘
           │  produces
           ▼
┌───────────────────────────────────────────────────┐
│  guards/INC-10x/                                  │
│   guard.json          ← incident manifest         │
│   regression.test.js  ← Vitest test (written by Bob) │
│   rule.yml            ← Semgrep rule (written by Bob) │
└──────────┬────────────────────────────────────────┘
           │  fed to
           ▼
┌───────────────────────────────────────────────────┐
│  guard/verify.mjs  (zero prod dependencies)       │
│                                                   │
│  1. Anti-cheat test file                          │
│  2. git worktree @ bugRef  → test must FAIL (assert) │
│  3. git worktree @ fixRef  → test must PASS       │
│  4. Rule on bugRef → must match seed              │
│  5. Rule on fixRef → must NOT match seed          │
│  6. Rule on HEAD   → collect variants             │
│  7. Check evidence paths                          │
│  8. Verdict: GUARDED | PARTIAL | FAILED           │
│  9. Cleanup worktrees                             │
└──────────┬────────────────────────────────────────┘
           │  writes
           ▼
┌───────────────────────────────────────────────────┐
│  reports/                                         │
│   INC-101.json, INC-102.json, INC-103.json        │
│   summary.json                                    │
│   history/run-1/  (before variant fixes)          │
│   history/run-2/  (after — all GUARDED)           │
└──────────┬────────────────────────────────────────┘
           │  sync-reports
           ▼
┌───────────────────────────────────────────────────┐
│  dashboard/ (Vite + React + TS + three.js)        │
│   Reads public/reports/*.json — fully static      │
│   Deployed → Vercel                               │
└───────────────────────────────────────────────────┘
```

---

## Repo structure (§5 of plan.md)

| Path | Purpose |
|------|---------|
| `shoplite/` | Demo Express app with 3 intentionally-planted bugs |
| `postmortems/` | 3 blameless postmortems (INC-101, INC-102, INC-103) |
| `guards/INC-10x/` | Generated guard artifacts per incident |
| `guard/` | Verifier CLI — `node guard/verify.mjs` |
| `reports/` | Verifier output JSON; `history/run-1` and `run-2` |
| `dashboard/` | Vite/React/three.js dashboard; deploys to Vercel |
| `docs/` | Architecture (this file) + submission assets |
| `bob_sessions/` | Task session screenshots (required by hackathon rules) |
| `.bob/` | Custom mode + `never-again` skill (project scope) |

---

## Solution outputs per incident (§4 of plan.md)

| # | Output | Proven by |
|---|--------|-----------|
| 1 | Regression test | Verifier: fail on `bugRef`, pass on `fixRef` |
| 2 | Variant rule | Verifier: match seed on `bugRef`, no match on `fixRef`, then scans HEAD |
| 3 | Variant fixes | Verifier reruns; exits 0 only when all variants = 0 |
| 4 | Action-item audit | Evidence file paths checked to exist |
| 5 | Verdict JSON | `reports/INC-10x.json` → dashboard |

---

## Demo app incidents

| Incident | Bug | Seed file | Variants |
|----------|-----|-----------|----------|
| INC-101 | `getHours()` without IST conversion → wrong delivery dates | `shoplite/src/delivery.js` | `loyalty.js`, `reports/daily.js` |
| INC-102 | `withRetry(fn)` no options → infinite retries, 0 ms delay | `shoplite/src/clients/payment.js` | `clients/inventory.js`, `clients/sms.js` |
| INC-103 | `item.price * qty` on null price → `₹NaN` checkout | `shoplite/src/pricing/lineTotal.js` | `pricing/cartTotal.js`, `invoice.js` |

---

## Bob 2.0 features map

| Bob feature | Where applied |
|-------------|--------------|
| Document understanding | Reads `postmortems/*.md` to extract structured data |
| Plan mode | Opens every phase; plan confirmed before implementation |
| Agent mode | All code generation: tests, rules, verifier, dashboard |
| Custom mode — "Postmortem Guard" | Project-scoped mode in `.bob/`; encodes guardrails |
| Skill — `never-again` | `/never-again` invocation; templates in `.bob/skills/` |
| Parallel subagents | Task 07: one subagent per incident, 3 in parallel |
| `/review` | Task 05: code review of `guard/` before trust |
| `/init` | Task 01: generated `AGENTS.md` |
| Commit message generation | Conventional commits per phase |
| Scoped auto-approve | Read + Edit only; Execute = manual approval |

---

## Data flow: `guard.json` schema

```json
{
  "incident": "INC-101",
  "title": "Midnight orders promised the wrong delivery date",
  "postmortem": "postmortems/INC-101-midnight-orders.md",
  "app": "shoplite",
  "bugRef": "inc-101-bug",
  "fixRef": "inc-101-fix",
  "test": "guards/INC-101/regression.test.js",
  "rule": {
    "engine": "semgrep",
    "path": "guards/INC-101/rule.yml",
    "seed": { "file": "shoplite/src/delivery.js", "line": 12 }
  },
  "actionItems": [
    {
      "id": "AI-1",
      "text": "Add a regression test for orders placed after midnight IST",
      "type": "test",
      "status": "guarded",
      "evidence": ["guards/INC-101/regression.test.js"]
    }
  ]
}
```

---

## Verifier report schema

```json
{
  "incident": "INC-101",
  "verdict": "PARTIAL",
  "proof": {
    "bug": { "exit": 1, "failedOn": "assertion", "ms": 812 },
    "fix": { "exit": 0, "ms": 790 }
  },
  "rule": {
    "engine": "semgrep",
    "seedMatchedOnBug": true,
    "seedCleanOnFix": true,
    "variants": [{ "file": "shoplite/src/loyalty.js", "line": 8, "status": "open" }]
  },
  "actionItems": [{ "id": "AI-1", "status": "guarded", "evidence": ["..."] }],
  "anticheat": { "passed": true },
  "timings": { "totalMs": 5321 },
  "generatedAt": "2026-09-27T09:45:00Z"
}
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+, ESM |
| Demo app | Express + Vitest |
| Variant rules | Semgrep (fallback: ESLint flat config) |
| Verifier | Plain Node (`child_process`, `fs`, git worktrees) — zero extra deps |
| Dashboard | Vite + React + TypeScript + `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing` + Framer Motion |
| Deploy | Vercel (static, framework preset: Vite, root: `dashboard/`) |
