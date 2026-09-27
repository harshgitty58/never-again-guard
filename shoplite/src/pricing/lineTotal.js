/**
 * Line-item total calculation.
 *
 * BUG (INC-103): multiplies item.price * qty directly without validating price.
 * If the inventory API returns price: null (discontinued SKU), the result is NaN.
 * Customers saw "₹NaN" in their cart and orders with ₹0 total were accepted.
 */

/**
 * @param {{ price: number|null }} item - item from inventory API
 * @param {number} qty - quantity ordered
 * @returns {number} line total in rupees
 */
export function lineTotal(item, qty) {
  // BUG: no null/NaN guard — if item.price is null this returns NaN
  return item.price * qty;
}
