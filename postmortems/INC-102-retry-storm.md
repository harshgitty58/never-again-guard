# INC-102: Retry Storm Took Down the Payment Gateway

**Date:** 2026-09-14 · **Severity:** SEV-1 · **Duration:** 47 minutes (14:23–15:10 IST) · **Author:** Arjun Nair (Backend Lead)

---

## Summary

On Sunday 14 Sep 2026, a brief 4-minute intermittent failure in the Razorpay payment gateway escalated into a 47-minute full checkout outage. The root cause was `withRetry(fn)` being called without `maxAttempts` in `src/clients/payment.js`. During the gateway blip, every active checkout request spawned a tight retry loop with zero delay, flooding the gateway with ~48,000 requests/min and triggering Razorpay's DDoS protection. This blacklisted ShopLite's API key for 43 minutes. 1,847 orders could not be completed; estimated lost revenue: ₹28.4 lakh.

---

## Customer Impact

| Metric | Value |
|---|---|
| Failed checkout sessions | 1,847 |
| Orders lost (not recovered post-outage) | 1,204 |
| Estimated lost GMV | ₹28,40,000 |
| "Payment failed" support tickets | 392 |
| Razorpay API key blacklist duration | 43 min |

---

## Timeline (IST, Sunday 14 Sep 2026)

| Time | Event |
|---|---|
| 14:23 | Razorpay reports internal connectivity issue; ShopLite payment calls begin failing. |
| 14:24 | `withRetry` loops begin spinning with 0 ms delay and no cap. |
| 14:25 | Razorpay receives ~48,000 req/min from ShopLite IPs; DDoS protection triggers. |
| 14:26 | Razorpay blacklists ShopLite API key. All payment calls now hard-fail. |
| 14:27 | Razorpay's internal issue resolves. ShopLite cannot recover — key is blocked. |
| 14:35 | Checkout error rate alert fires (threshold: 5%; actual: 100%). Arjun paged. |
| 14:52 | Root cause identified as infinite retry. Fix prepared. |
| 15:03 | Razorpay support contacted; key manually unblocked after escalation. |
| 15:10 | Patch deployed. Checkout restored. |
| 15:30 | Post-incident call. |

---

## Root Cause (5 Whys)

1. **Why** was checkout down for 47 min after a 4-min gateway blip? → ShopLite's API key was blacklisted by Razorpay for flooding.
2. **Why** did ShopLite flood Razorpay? → `withRetry(fn)` retried infinitely with 0 ms delay.
3. **Why** was there no retry limit? → `withRetry` defaults to `maxAttempts: Infinity` and the payment client called it with no options.
4. **Why** was there no options enforcement? → `withRetry` was designed as a generic utility; callers were expected to supply limits, but nothing enforced it.
5. **Why** wasn't the same pattern spotted in inventory and SMS clients? → Code review focused on happy-path logic; no static analysis checked for bare `withRetry(fn)` calls.

**Seed file:** `shoplite/src/clients/payment.js`, line 19 (`withRetry(() => gatewayFn(payload))`).

**Trigger:** Any transient external service failure that causes a retry burst — extremely common in production.

---

## What Went Well

- Alert fired within 12 minutes.
- Fix was straightforward once identified.
- Razorpay support unblocked the key after escalation (no data loss on their side).

## What Went Wrong

- `withRetry` had a dangerous default (`Infinity`) with no compile-time or runtime warning.
- Two other clients (`inventory.js`, `sms.js`) had the same pattern — undiscovered until after the incident.
- The alert threshold (5%) was too high; the real signal was request rate, not error rate.
- No circuit breaker or rate limiter was in place between ShopLite and third-party APIs.

---

## Action Items

| ID | Action | Type | Owner | Due |
|---|---|---|---|---|
| AI-1 | Add a regression test for `payment.js` that uses a gateway that always fails and fake timers; assert call count ≤ 4 and that delay increases between attempts. Test must fail on the buggy commit and pass on the fix. | test | Backend team | +3 days |
| AI-2 | Write a Semgrep rule that flags `withRetry($F)` called with exactly one argument (missing options). Run across the whole repo and fix every match. | rule | Platform / SRE | +5 days |
| AI-3 | Fix `inventory.js` and `sms.js` to pass `{ maxAttempts: 4, backoffMs: 200, jitter: true }` to `withRetry`. | code | Backend team | +5 days |
| AI-4 | Change the `withRetry` default for `maxAttempts` from `Infinity` to `3` with a console warning when no options are passed. | code | Backend team | +5 days |
| AI-5 | Document the "always supply retry options" rule in `CONTRIBUTING.md` and add it to the code-review checklist. | process | Engineering Lead | +7 days |
