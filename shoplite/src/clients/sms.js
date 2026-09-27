/**
 * SMS notification client.
 *
 * VARIANT (INC-102): calls withRetry(fn) with no options — same unbounded-retry
 * pattern as the payment client bug.
 */
import { withRetry } from '../util/retry.js';

export function makeSmsClient(smsFn) {
  return {
    async send(message) {
      // VARIANT: no maxAttempts, no backoff
      return withRetry(() => smsFn(message));
    },
  };
}
