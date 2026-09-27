/**
 * Line-item total calculation.
 *
 * FIX (INC-103): validates price through toMoney() before arithmetic.
 * Throws PriceUnavailableError for null/NaN prices instead of silently
 * producing NaN that propagates to the customer's cart display.
 */
import { toMoney } from '../util/money.js';

/**
 * @param {{ price: number|null }} item - item from inventory API
 * @param {number} qty - quantity ordered
 * @returns {number} line total in rupees
 */
export function lineTotal(item, qty) {
  // FIX: toMoney() throws PriceUnavailableError if price is null/NaN
  return toMoney(item.price) * qty;
}
