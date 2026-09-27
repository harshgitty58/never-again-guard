/**
 * Money utilities — all monetary arithmetic lives here.
 * Ensures prices are valid finite numbers before arithmetic.
 */

export class PriceUnavailableError extends Error {
  constructor(value) {
    super(`Price unavailable or invalid: ${value}`);
    this.name = 'PriceUnavailableError';
  }
}

/**
 * Validate and coerce a raw price value.
 * Throws PriceUnavailableError if the value is null, undefined, NaN, or not finite.
 * Returns a Number.
 */
export function toMoney(value) {
  const n = Number(value);
  if (value === null || value === undefined || !isFinite(n)) {
    throw new PriceUnavailableError(value);
  }
  return n;
}

/**
 * Round to 2 decimal places (standard money rounding).
 */
export function round(amount) {
  return Math.round(amount * 100) / 100;
}
