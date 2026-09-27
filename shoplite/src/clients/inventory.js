/**
 * Inventory service client.
 *
 * VARIANT (INC-102): calls withRetry(fn) with no options — same unbounded-retry
 * pattern as the payment client bug.
 */
import { withRetry } from '../util/retry.js';

export function makeInventoryClient(apiFn) {
  return {
    async checkStock(skuId) {
      // VARIANT: no maxAttempts, no backoff
      return withRetry(() => apiFn({ skuId }));
    },
  };
}
