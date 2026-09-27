/**
 * Payment gateway client.
 *
 * FIX (INC-102): calls withRetry(fn, opts) with bounded maxAttempts,
 * backoff, and jitter — prevents hammering the gateway during outages.
 */
import { withRetry } from '../util/retry.js';

export function makePaymentClient(gatewayFn) {
  return {
    /**
     * Charge a customer. Returns the gateway response.
     * @param {Object} payload - { customerId, amountPaise }
     */
    async charge(payload) {
      // FIX: bounded retries with backoff and jitter
      return withRetry(() => gatewayFn(payload), {
        maxAttempts: 4,
        backoffMs: 200,
        jitter: true,
      });
    },
  };
}
