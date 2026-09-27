/**
 * Payment gateway client.
 *
 * BUG (INC-102): calls withRetry(fn) with no options →
 * maxAttempts defaults to Infinity, backoffMs = 0.
 * During a gateway outage this hammered the gateway with thousands of
 * immediate retries until the process was restarted.
 */
import { withRetry } from '../util/retry.js';

export function makePaymentClient(gatewayFn) {
  return {
    /**
     * Charge a customer. Returns the gateway response.
     * @param {Object} payload - { customerId, amountPaise }
     */
    async charge(payload) {
      // BUG: no maxAttempts → infinite retries, no delay, no jitter
      return withRetry(() => gatewayFn(payload));
    },
  };
}
