/**
 * Retry utility — retries an async function with optional backoff.
 *
 * Options:
 *   maxAttempts {number}  - maximum number of attempts (default: Infinity — UNSAFE for production)
 *   backoffMs   {number}  - base delay in ms between attempts (default: 0)
 *   jitter      {boolean} - add random jitter (0–50% of backoffMs) to each delay (default: false)
 *   delayFn     {Function}- optional override for delay: (ms) => Promise<void>
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = Infinity,
    backoffMs = 0,
    jitter = false,
    delayFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts) throw err;
      let delay = backoffMs * attempt;
      if (jitter) delay += Math.floor(Math.random() * backoffMs * 0.5);
      if (delay > 0) await delayFn(delay);
    }
  }
}
