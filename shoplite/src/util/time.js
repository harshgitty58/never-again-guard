/**
 * Time utilities — all IST-aware helpers live here.
 * IST = UTC+5:30 = UTC + 19800 seconds.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 19800000 ms

/**
 * Convert a UTC Date to an IST Date (same instant, different representation).
 * Returns a plain Date whose .getHours()/.getDate() etc. reflect IST local time.
 */
export function toIST(date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Get the IST hour (0-23) for a given UTC Date.
 */
export function getISTHour(date) {
  return toIST(date).getUTCHours();
}

/**
 * Get the IST date-string "YYYY-MM-DD" for a given UTC Date.
 */
export function getISTDateString(date) {
  const ist = toIST(date);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add N calendar days to a date (returns a new Date, UTC midnight).
 */
export function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
