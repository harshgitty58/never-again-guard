# INC-101: Midnight Orders Promised the Wrong Delivery Date

**Date:** 2026-09-20 · **Severity:** SEV-2 · **Duration:** ~6 hours (00:00–06:10 IST) · **Author:** Priya Sharma (On-Call SRE)

---

## Summary

Between 00:00 and 05:30 IST on Sunday 20 Sep 2026, ShopLite promised customers a delivery date that was one day early. The order-confirmation email said "Delivery by **Sunday 20 Sep**" for orders placed after midnight IST. The actual shipment could not leave until Monday because the warehouse operates on IST cutoffs. Approximately 312 orders were affected; 87 customers complained via support; 6 requested cancellations. Estimated goodwill vouchers issued: ₹93,600 (300 × ₹312 avg basket).

---

## Customer Impact

| Metric | Value |
|---|---|
| Orders with wrong delivery promise | 312 |
| Customer complaints (in-app + email) | 87 |
| Cancellations | 6 |
| Goodwill vouchers issued | ₹93,600 |
| Delivery SLA breach rate (Sunday) | 18.4% |

---

## Timeline (IST, Sunday 20 Sep 2026)

| Time | Event |
|---|---|
| 00:01 | First order placed after midnight IST. Confirmation email: "Deliver by Sun 20 Sep" (wrong — should be Mon 21 Sep). |
| 02:44 | Customer tweets screenshot of wrong date. 4 RT in 20 min. |
| 04:30 | Support queue spike detected by on-call. |
| 05:17 | Priya (SRE) paged. Begins investigation. |
| 05:49 | Root cause identified: `delivery.js` using UTC `getHours()` on a UTC server. |
| 06:10 | Feature-flagged the affected time window to show "+1 uncertainty" message; immediate customer notifications sent. |
| 08:30 | Patch deployed to production. Wrong-date window closed. |
| 11:00 | Retrospective call held. |

---

## Root Cause (5 Whys)

1. **Why** did customers get the wrong date? → `promisedDeliveryDate()` returned the wrong day.
2. **Why** did it return the wrong day? → It compared `now.getHours()` (UTC) against the 14:00 IST cut-off.
3. **Why** did it use UTC hours? → The developer assumed `new Date()` methods return local time; the production server runs UTC with no local timezone set.
4. **Why** wasn't this caught in tests? → The test suite only exercised UTC daytime hours (09:00–15:00 UTC = 14:30–20:30 IST), where UTC hour ≈ IST hour for the cut-off comparison.
5. **Why** wasn't there a timezone convention? → No team-wide rule existed requiring IST-aware helpers; `util/time.js` existed but was never enforced.

**Seed file:** `shoplite/src/delivery.js`, line 22 (`now.getHours()`).

**Trigger:** Orders placed in the 00:00–05:29 IST window (= 18:30–23:59 UTC previous calendar day) — a regular occurrence that was never tested.

---

## What Went Well

- On-call detected the spike before 05:30 IST (before the window closed naturally).
- Mitigation (feature flag) was applied within 21 minutes of paging.
- Root cause was clear once reproduction was attempted.

## What Went Wrong

- No test covered the 00:00–05:30 IST window (the exact failure window).
- `util/time.js` existed but nothing enforced its use for date comparisons.
- Two other modules (`loyalty.js`, `reports/daily.js`) had the identical pattern — no one had audited callers.
- The postmortem from a similar TZ issue in 2024 was never fully actioned.

---

## Action Items

| ID | Action | Type | Owner | Due |
|---|---|---|---|---|
| AI-1 | Add a regression test for `promisedDeliveryDate` that fails on the buggy commit (00:00–05:29 IST input → wrong date) and passes on the fix. | test | Backend team | +3 days |
| AI-2 | Write and enforce a Semgrep rule that flags `.getHours()`, `.getDate()`, `.getDay()`, `.getMonth()` called on Date objects outside `util/time.js`. Run on the whole repo; fix every match. | rule | SRE / Platform | +5 days |
| AI-3 | Fix `loyalty.js` and `reports/daily.js` to use `util/time.js` helpers (found by AI-2's rule). | code | Backend team | +5 days |
| AI-4 | Update the on-call runbook: add "check TZ in server config" as the first step for any date/time anomaly alert. | process | On-Call Lead | +7 days |
| AI-5 | Run the regression test and rule scan in CI on every PR touching `src/`; gate merge if either fails. | process | Platform / CI | +10 days |
