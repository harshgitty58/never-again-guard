/**
 * Loyalty / birthday-discount module.
 *
 * Gives a 10% discount to customers who place an order on their birthday.
 *
 * VARIANT (INC-101): uses new Date().getDate() — server is UTC, customer is IST.
 * A customer with birthday on the 1st of a month may miss the discount at 00:00–05:30 IST.
 */

/**
 * @param {Object} customer - { name, birthdayMonth: 1-12, birthdayDay: 1-31 }
 * @param {Date} [now] - injectable clock for testing (defaults to real clock)
 * @returns {number} discount fraction (0.1 = 10%, 0 = none)
 */
export function birthdayDiscount(customer, now = new Date()) {
  // VARIANT: uses raw getDate()/getMonth() — server-local (UTC), not IST
  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;

  if (
    todayDay === customer.birthdayDay &&
    todayMonth === customer.birthdayMonth
  ) {
    return 0.1;
  }
  return 0;
}
