/**
 * Inventory service client.
 *
 * FIXED (INC-102 variant): passes bounded retry options to withRetry.
 */
import { withRetry } from '../util/retry.js';

export function makeInventoryClient(apiFn) {
  return {
    async checkStock(skuId) {
      // FIXED: bounded retries with backoff and jitter
      return withRetry(() => apiFn({ skuId }), {
        maxAttempts: 4,
        backoffMs: 200,
        jitter: true,
      });
    },
  };
}
