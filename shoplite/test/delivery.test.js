import { describe, it, expect } from 'vitest';
import { promisedDeliveryDate } from '../src/delivery.js';

describe('promisedDeliveryDate', () => {
  it('returns same day for 10:00 UTC (server time, normal business hours)', () => {
    // Tests pass with UTC hours in normal daytime — the bug is invisible here
    const now = new Date('2026-09-27T04:30:00Z'); // 04:30 UTC = 10:00 IST
    expect(promisedDeliveryDate(now)).toBe('2026-09-27');
  });

  it('returns next day for 15:00 UTC (21:30 IST — after cutoff)', () => {
    const now = new Date('2026-09-27T15:00:00Z'); // 15:00 UTC = 20:30 IST
    expect(promisedDeliveryDate(now)).toBe('2026-09-28');
  });

  it('handles midnight UTC (00:00 UTC = 05:30 IST — after midnight, fine on UTC server)', () => {
    // At 00:00 UTC = 05:30 IST — IST hour is 5, which is < 14, should be same-day.
    // Bug: getHours() returns 0 (UTC) which is also < 14, so by coincidence it passes!
    // The real failure is at 18:30–23:59 UTC = 00:00–05:29 IST (previous calendar day).
    const now = new Date('2026-09-27T00:00:00Z');
    expect(promisedDeliveryDate(now)).toBe('2026-09-27');
  });
});
