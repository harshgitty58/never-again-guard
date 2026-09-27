/**
 * Cart total calculation — sums line totals for all items in a cart.
 *
 * FIXED (INC-103 variant): uses toMoney() from util/money.js before arithmetic
 * to catch null/undefined prices from the inventory API.
 */
import { toMoney } from '../util/money.js';

/**
 * @param {Array<{price: number|null, qty: number}>} items
 * @returns {number} cart total in rupees
 */
export function cartTotal(items) {
  // FIXED: toMoney() throws PriceUnavailableError if any price is null/NaN
  return items.reduce((sum, item) => sum + toMoney(item.price) * item.qty, 0);
}
