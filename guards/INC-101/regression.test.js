/**
 * INC-101 Regression Test — "Midnight Orders"
 *
 * Root cause: promisedDeliveryDate() used getHours() (UTC) instead of IST hour
 * to evaluate the 14:00 cut-off. When it's after 14:00 IST but before 14:00 UTC
 * (e.g. 15:30 IST = 10:00 UTC), the buggy code sees UTC hour 10 < 14 and promises
 * same-day delivery — but the warehouse runs on IST and will ship next day.
 *
 * MUST FAIL  on inc-101-bug  (assertion: wrong date returned)
 * MUST PASS  on inc-101-fix  (IST-aware logic returns correct date)
 */
import { describe, it, expect } from 'vitest';
import { promisedDeliveryDate } from '../src/delivery.js';

describe('INC-101 regression: promisedDeliveryDate', () => {
  it('returns next-day for order at 15:30 IST (10:00 UTC) — after IST cut-off but before UTC cut-off', () => {
    // 2026-09-27 10:00 UTC = 2026-09-27 15:30 IST
    // IST hour = 15 >= 14  →  next-day delivery  →  "2026-09-28"
    // BUG: UTC hour = 10 < 14  →  same-day delivery  →  "2026-09-27"  (WRONG)
    const now = new Date('2026-09-27T10:00:00Z');
    expect(promisedDeliveryDate(now)).toBe('2026-09-28');
  });

  it('returns same-day for order at 08:00 IST (02:30 UTC) — before both cut-offs', () => {
    // 2026-09-27 02:30 UTC = 2026-09-27 08:00 IST
    // IST hour = 8 < 14  →  same-day  →  "2026-09-27"  (both bug and fix agree here)
    const now = new Date('2026-09-27T02:30:00Z');
    expect(promisedDeliveryDate(now)).toBe('2026-09-27');
  });

  it('returns Oct 1 for order at 15:30 IST on Sep 30 (month boundary)', () => {
    // 2026-09-30 10:00 UTC = 2026-09-30 15:30 IST
    // IST: next-day = Oct 1  →  "2026-10-01"
    // BUG: UTC hour 10 < 14 → same-day  →  "2026-09-30"  (WRONG)
    const now = new Date('2026-09-30T10:00:00Z');
    expect(promisedDeliveryDate(now)).toBe('2026-10-01');
  });
});
