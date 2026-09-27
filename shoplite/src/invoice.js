/**
 * Invoice generation — computes tax and total for an order.
 *
 * FIXED (INC-103 variant): uses toMoney() from util/money.js before arithmetic
 * to catch null/undefined prices from the inventory API.
 */
import { toMoney } from './util/money.js';

const GST_RATE = 0.18;

/**
 * @param {Array<{name: string, price: number|null, qty: number}>} items
 * @returns {{ subtotal: number, tax: number, total: number }}
 */
export function generateInvoice(items) {
  // FIXED: toMoney() throws PriceUnavailableError if any price is null/NaN
  const subtotal = items.reduce((s, item) => s + toMoney(item.price) * item.qty, 0);
  const tax = subtotal * GST_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
