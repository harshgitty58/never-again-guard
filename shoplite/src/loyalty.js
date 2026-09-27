/**
 * Loyalty / birthday-discount module.
 *
 * Gives a 10% discount to customers who place an order on their birthday.
 *
 * FIXED (INC-101 variant): uses IST-aware helpers from util/time.js
 * instead of raw getDate()/getMonth() which return UTC on the production server.
 */
import { toIST } from './util/time.js';

/**
 * @param {Object} customer - { name, birthdayMonth: 1-12, birthdayDay: 1-31 }
 * @param {Date} [now] - injectable clock for testing (defaults to real clock)
 * @returns {number} discount fraction (0.1 = 10%, 0 = none)
 */
export function birthdayDiscount(customer, now = new Date()) {
  // FIXED: convert to IST before extracting day/month
  const ist = toIST(now);
  const todayDay = ist.getUTCDate();
  const todayMonth = ist.getUTCMonth() + 1;

  if (
    todayDay === customer.birthdayDay &&
    todayMonth === customer.birthdayMonth
  ) {
    return 0.1;
  }
  return 0;
}
