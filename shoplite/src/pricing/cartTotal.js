/**
 * Cart total calculation — sums line totals for all items in a cart.
 *
 * VARIANT (INC-103): accesses item.price directly in arithmetic without
 * going through util/money.js — same null-price vulnerability.
 */

/**
 * @param {Array<{price: number|null, qty: number}>} items
 * @returns {number} cart total in rupees
 */
export function cartTotal(items) {
  // VARIANT: direct arithmetic on .price — NaN if any price is null
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
