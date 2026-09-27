/**
 * Daily sales reporting — groups orders by day.
 *
 * VARIANT (INC-101): groups by getDay() (day-of-week) but uses server-local UTC.
 * Should use IST-aware date grouping via util/time.js.
 */

/**
 * @param {Array<{placedAt: Date, total: number}>} orders
 * @param {Date} [now] - injectable clock for testing
 * @returns {Object} map of day-of-week index (0=Sun) → total revenue
 */
export function dailySalesByWeekday(orders, now = new Date()) {
  const result = {};

  for (const order of orders) {
    // VARIANT: getDay() uses server-local (UTC) day-of-week, not IST
    const day = order.placedAt.getDay();
    result[day] = (result[day] || 0) + order.total;
  }

  return result;
}
