# INC-103: ₹NaN Checkout — Null Price from Inventory API

**Date:** 2026-09-07 · **Severity:** SEV-2 · **Duration:** ~3 hours (09:00–12:05 IST) · **Author:** Sneha Kulkarni (Full-Stack Lead)

---

## Summary

On Sunday 7 Sep 2026, a routine SKU discontinuation in the inventory management system caused the inventory API to return `price: null` for 14 discontinued SKUs. `src/pricing/lineTotal.js` multiplied `null * qty` directly, producing `NaN`. Customers saw "**₹NaN**" displayed as the line-item price in their cart, and 31 orders with a computed total of ₹0 were accepted and queued for fulfilment. The fulfilment team caught the ₹0 orders manually during a morning audit. Estimated revenue at risk (orders accepted at ₹0): ₹46,800. Additionally, 210 customers saw ₹NaN in their cart, increasing cart abandonment by an estimated 8% for the 3-hour window.

---

## Customer Impact

| Metric | Value |
|---|---|
| SKUs with null price | 14 |
| Orders accepted at ₹0 (revenue at risk) | 31 |
| Revenue at risk | ₹46,800 |
| Customers who saw ₹NaN in cart | ~210 |
| Estimated cart abandonment increase | ~8% for 3 h |
| Support tickets ("broken cart") | 44 |

---

## Timeline (IST, Sunday 7 Sep 2026)

| Time | Event |
|---|---|
| 09:00 | Inventory team runs quarterly SKU discontinuation batch (14 SKUs). Inventory API begins returning `price: null` for those SKUs. |
| 09:02 | First customer cart loads `₹NaN` for a discontinued item. |
| 09:15 | First "broken cart" support ticket filed. |
| 09:45 | Fulfilment team notices 31 orders with ₹0 total in the morning queue audit. Escalates to on-call. |
| 10:10 | Sneha paged. Investigates inventory API response schema. |
| 10:38 | Root cause identified: no null guard in `lineTotal.js` before multiplication. |
| 11:00 | Fix deployed: `lineTotal.js` now calls `toMoney(item.price)` which throws `PriceUnavailableError` for null. Cart now shows "Unavailable" for the item. |
| 11:15 | ₹0 orders put on manual hold; customers notified and offered alternatives. |
| 12:05 | All affected orders resolved. Post-incident call scheduled. |

---

## Root Cause (5 Whys)

1. **Why** did customers see ₹NaN? → `lineTotal.js` returned `NaN` for items with `price: null`.
2. **Why** was the result `NaN`? → `null * qty` = `NaN` in JavaScript; no validation before multiplication.
3. **Why** was there no validation? → The inventory API schema was assumed to always return a positive number for price; null was never considered.
4. **Why** was `price: null` not expected? → No API contract (schema or TypeScript type) was enforced; the client consumed raw JSON.
5. **Why** did two other modules (`cartTotal.js`, `invoice.js`) have the same bug? → Price arithmetic existed in several places; the `util/money.js` guard was written but never enforced or documented as the required path.

**Seed file:** `shoplite/src/pricing/lineTotal.js`, line 15 (`item.price * qty`).

**Trigger:** Any upstream API returning `null` or `undefined` for a numeric field — a valid API state for discontinued or out-of-stock items.

---

## What Went Well

- Fulfilment team's manual ₹0-order audit caught the issue before shipment.
- Root cause was unambiguous — JavaScript `NaN` propagation is easy to trace.
- `util/money.js` with `toMoney()` already existed; fix was 1 line.

## What Went Wrong

- `util/money.js` existed but was never mandated; three places did raw price arithmetic.
- No schema validation on the inventory API response; `null` was a valid response never guarded against.
- Accepted ₹0 orders — no minimum order value guard at the checkout layer.
- Cart display layer rendered `NaN` directly without a fallback display value.

---

## Action Items

| ID | Action | Type | Owner | Due |
|---|---|---|---|---|
| AI-1 | Add a regression test for `lineTotal` that passes `{ price: null }` and asserts a `PriceUnavailableError` is thrown (fail on bug commit, pass on fix commit). | test | Backend team | +3 days |
| AI-2 | Write a Semgrep rule that flags direct arithmetic (`*`, `+`, `-`) on `$X.price` outside `util/money.js`. Run across the repo; fix every match. | rule | Platform / SRE | +5 days |
| AI-3 | Fix `cartTotal.js` and `invoice.js` to use `toMoney(item.price)` before any arithmetic. | code | Backend team | +5 days |
| AI-4 | Add a minimum-order-value guard at the checkout API layer: reject any order with total ≤ ₹0. | code | Backend team | +7 days |
| AI-5 | Add inventory API response validation (zod/JSON schema) so `price: null` is caught at the boundary, not in business logic. | process | Platform team | +14 days |
