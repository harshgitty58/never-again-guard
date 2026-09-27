/**
 * SMS notification client.
 *
 * FIXED (INC-102 variant): passes bounded retry options to withRetry.
 */
import { withRetry } from '../util/retry.js';

export function makeSmsClient(smsFn) {
  return {
    async send(message) {
      // FIXED: bounded retries with backoff and jitter
      return withRetry(() => smsFn(message), {
        maxAttempts: 4,
        backoffMs: 200,
        jitter: true,
      });
    },
  };
}
