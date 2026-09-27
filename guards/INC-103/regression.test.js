/**
 * INC-103 Regression Test — "₹NaN Checkout"
 *
 * Root cause: lineTotal() multiplied item.price * qty without validating price.
 * When inventory API returned price: null for discontinued SKUs, the result was NaN,
 * showing "₹NaN" in carts and allowing ₹0 orders to be accepted.
 *
 * MUST FAIL  on inc-103-bug  (null * qty = NaN; assertion checks for error)
 * MUST PASS  on inc-103-fix  (PriceUnavailableError thrown for null price)
 */
import { describe, it, expect } from 'vitest';
import { lineTotal } from '../src/pricing/lineTotal.js';

describe('INC-103 regression: lineTotal with null price', () => {
  it('throws PriceUnavailableError when item.price is null (discontinued SKU)', () => {
    // BUG: null * 3 = NaN — no error thrown, NaN propagates silently
    // FIX: toMoney(null) throws PriceUnavailableError
    expect(() => lineTotal({ price: null }, 3)).toThrow('Price unavailable');
  });

  it('throws PriceUnavailableError when item.price is undefined', () => {
    expect(() => lineTotal({ price: undefined }, 2)).toThrow('Price unavailable');
  });

  it('returns correct total for a valid price', () => {
    // Both bug and fix agree: 250 * 2 = 500
    expect(lineTotal({ price: 250 }, 2)).toBe(500);
  });

  it('result must be a finite number (not NaN) for any valid price', () => {
    const result = lineTotal({ price: 99 }, 3);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(297);
  });
});
