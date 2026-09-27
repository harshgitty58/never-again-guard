/**
 * Delivery date calculation for ShopLite orders.
 *
 * Business rule: orders placed before 14:00 IST ship same-day,
 * orders placed at or after 14:00 IST ship the next day.
 *
 * FIX (INC-101): use IST-aware helpers from util/time.js instead of
 * raw Date methods which return UTC on the production server.
 */
import { getISTHour, getISTDateString, addDays } from './util/time.js';

/**
 * @param {Date} now - current UTC timestamp
 * @returns {string} promised delivery date as "YYYY-MM-DD"
 */
export function promisedDeliveryDate(now) {
  const CUT_OFF_HOUR = 14; // 14:00 IST

  // FIX: use IST hour, not server-local (UTC) hour
  const istHour = getISTHour(now);
  const sameDay = istHour < CUT_OFF_HOUR;

  if (sameDay) {
    return getISTDateString(now);
  }
  return getISTDateString(addDays(now, 1));
}
