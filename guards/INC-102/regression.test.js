/**
 * INC-102 Regression Test — "Retry Storm"
 *
 * Root cause: makePaymentClient called withRetry(fn) with no options,
 * defaulting to maxAttempts=Infinity. During a gateway outage, this caused
 * unbounded rapid-fire retries that triggered Razorpay's DDoS protection.
 *
 * MUST FAIL  on inc-102-bug  (assertion: call count exceeds 4 OR test hangs)
 * MUST PASS  on inc-102-fix  (call count <= 4, error thrown after max attempts)
 *
 * Uses a fake delayFn injected via the retry utility to avoid real timers.
 */
import { describe, it, expect, vi } from 'vitest';
import { makePaymentClient } from '../src/clients/payment.js';

describe('INC-102 regression: makePaymentClient bounded retries', () => {
  it('stops retrying after at most 4 attempts when the gateway always fails', async () => {
    let callCount = 0;

    // A gateway that always rejects
    const alwaysFailGateway = async () => {
      callCount++;
      throw new Error('gateway unavailable');
    };

    const client = makePaymentClient(alwaysFailGateway);

    // Patch withRetry's internal setTimeout so the test doesn't actually wait
    // We do this by replacing the delayFn — but makePaymentClient doesn't expose it.
    // Instead we rely on the fact that with the FIX, maxAttempts=4, backoffMs=200, jitter=true.
    // With real timers this would take ~800ms (4×200ms) — acceptable for a test.
    // With the BUG (Infinity attempts, 0ms delay), callCount would be enormous quickly.
    // We cap with a timeout to prevent the test hanging forever on the bug.
    const start = Date.now();
    let threw = false;
    try {
      await Promise.race([
        client.charge({ customerId: 'c1', amountPaise: 1000 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout: too many retries (bug)')), 2000)
        ),
      ]);
    } catch (err) {
      threw = true;
      // On bug: either 'timeout: too many retries' OR callCount is already huge
      // On fix: 'gateway unavailable' after exactly 4 attempts
    }

    expect(threw).toBe(true); // must throw (gateway always fails)
    // Key assertion: call count must be at most 4
    expect(callCount).toBeLessThanOrEqual(4);
  });

  it('succeeds if the gateway recovers within max attempts', async () => {
    let calls = 0;
    const recoversOnThird = async () => {
      calls++;
      if (calls < 3) throw new Error('not yet');
      return { transactionId: 'txn-ok' };
    };
    const client = makePaymentClient(recoversOnThird);
    const result = await client.charge({ customerId: 'c2', amountPaise: 500 });
    expect(result.transactionId).toBe('txn-ok');
    expect(calls).toBe(3);
  });
});
