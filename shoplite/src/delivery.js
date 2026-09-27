/**
 * Delivery date calculation for ShopLite orders.
 *
 * Business rule: orders placed before 14:00 IST ship same-day,
 * orders placed at or after 14:00 IST ship the next day.
 *
 * BUG (INC-101): uses server-local Date methods (server runs UTC).
 * Orders placed 00:00–05:30 IST (= 18:30–00:00 UTC previous day)
 * get the wrong promised date because getHours() returns UTC hours.
 */

/**
 * @param {Date} now - current UTC timestamp
 * @returns {string} promised delivery date as "YYYY-MM-DD"
 */
export function promisedDeliveryDate(now) {
  const CUT_OFF_HOUR = 14; // 14:00 IST

  // BUG: getHours() returns UTC hour, not IST hour.
  // On the production server (UTC), this is wrong for IST customers.
  const hour = now.getHours();
  const sameDay = hour < CUT_OFF_HOUR;

  const deliveryDate = new Date(now);
  if (!sameDay) {
    // BUG: getDate() + setDate() uses local (UTC) calendar day
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  const y = deliveryDate.getFullYear();
  const m = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const d = String(deliveryDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
