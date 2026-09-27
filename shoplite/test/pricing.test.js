import { describe, it, expect } from 'vitest';
import { lineTotal } from '../src/pricing/lineTotal.js';
import { cartTotal } from '../src/pricing/cartTotal.js';
import { generateInvoice } from '../src/invoice.js';

describe('lineTotal', () => {
  it('calculates price * qty for valid prices', () => {
    expect(lineTotal({ price: 100 }, 3)).toBe(300);
    expect(lineTotal({ price: 49.99 }, 2)).toBeCloseTo(99.98);
  });
  // NOTE: no test for null price — the bug is not covered here
});

describe('cartTotal', () => {
  it('sums all items', () => {
    const items = [
      { price: 100, qty: 2 },
      { price: 50, qty: 1 },
    ];
    expect(cartTotal(items)).toBe(250);
  });
});

describe('generateInvoice', () => {
  it('computes subtotal, tax, and total', () => {
    const items = [{ name: 'Widget', price: 100, qty: 2 }];
    const inv = generateInvoice(items);
    expect(inv.subtotal).toBe(200);
    expect(inv.tax).toBeCloseTo(36);
    expect(inv.total).toBeCloseTo(236);
  });
});
