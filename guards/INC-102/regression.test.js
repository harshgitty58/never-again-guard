/**
 * INC-102 Regression Test — "Retry Storm"
 *
 * Root cause: makePaymentClient called withRetry(fn) with no options,
 * defaulting to maxAttempts=Infinity, backoffMs=0. During a gateway outage,
 * every checkout spawned an infinite tight-loop with zero delay that hammered
 * Razorpay until its DDoS protection blacklisted ShopLite's key for 43 min.
 *
 * MUST FAIL  on inc-102-bug  (assertion: callCount > 4)
 * MUST PASS  on inc-102-fix  (callCount <= 4, rejects after exactly 4 attempts)
 *
 * Design: the gateway itself caps the loop at 10 successful returns.
 * This breaks an unbounded loop without relying on timers (which never get
 * a turn when backoffMs=0 and the event loop is starved by sync-like awaits).
 *
 *   Bug commit:  Infinity retries, 0ms delay → 10 calls made → callCount=10 → assertion fails ✓
 *   Fix commit:  maxAttempts=4, backoffMs=200 → 4 calls made → callCount=4  → assertion passes ✓
 */
import { describe, it, expect } from 'vitest';
import { makePaymentClient } from '../src/clients/payment.js';

describe('INC-102 regression: makePaymentClient bounded retries', () => {
  it('stops retrying after at most 4 attempts when gateway always fails', async () => {
    let callCount = 0;

    // Gateway that fails for the first 9 calls, then resolves as a safety cap.
    // This ensures an unbounded-retry bug terminates quickly (at call 10) rather
    // than hanging indefinitely. The fix path throws after 4 attempts so never
    // reaches the cap.
    const cappedGateway = async () => {
      callCount++;
      if (callCount >= 10) return { transactionId: 'cap' }; // safety cap
      throw new Error('gateway unavailable');
    };

    const client = makePaymentClient(cappedGateway);
    // Ignore the final outcome — we only care about callCount
    await client.charge({ customerId: 'c1', amountPaise: 1000 }).catch(() => {});

    // KEY assertion: the bug allows 10 calls (fails here); the fix stops at 4 (passes)
    expect(callCount).toBeLessThanOrEqual(4);
  }, 15000); // 15s — fix path takes ~800ms–1200ms due to real backoff+jitter

  it('succeeds if the gateway recovers within max attempts', async () => {
    let calls = 0;
    const recoversOnThird = async () => {
      calls++;
      if (calls < 3) throw new Error('not yet');
      return { transactionId: 'txn-ok' };
    };
    const client = makePaymentClient(recoversOnThird);
    const result = await client.charge({ customerId: 'c3', amountPaise: 500 });
    expect(result.transactionId).toBe('txn-ok');
    expect(calls).toBe(3);
  }, 15000);
});
