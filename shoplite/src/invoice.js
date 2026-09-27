/**
 * Invoice generation — computes tax and total for an order.
 *
 * VARIANT (INC-103): accesses item.price directly in arithmetic without
 * going through util/money.js — same null-price vulnerability.
 */

const GST_RATE = 0.18;

/**
 * @param {Array<{name: string, price: number|null, qty: number}>} items
 * @returns {{ subtotal: number, tax: number, total: number }}
 */
export function generateInvoice(items) {
  // VARIANT: direct arithmetic on .price — NaN if any price is null
  const subtotal = items.reduce((s, item) => s + item.price * item.qty, 0);
  const tax = subtotal * GST_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
