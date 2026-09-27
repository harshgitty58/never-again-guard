/**
 * Daily sales reporting — groups orders by day.
 *
 * FIXED (INC-101 variant): uses IST-aware date grouping via util/time.js
 * instead of raw getDay() which returns UTC day-of-week on the production server.
 */
import { toIST } from './util/time.js';

/**
 * @param {Array<{placedAt: Date, total: number}>} orders
 * @returns {Object} map of IST day-of-week index (0=Sun) → total revenue
 */
export function dailySalesByWeekday(orders) {
  const result = {};

  for (const order of orders) {
    // FIXED: use IST day-of-week, not UTC
    const day = toIST(order.placedAt).getUTCDay();
    result[day] = (result[day] || 0) + order.total;
  }

  return result;
}
