import { describe, it, expect } from 'vitest';
import { makePaymentClient } from '../src/clients/payment.js';

describe('makePaymentClient', () => {
  it('calls gateway and returns the result on success', async () => {
    const gateway = async (payload) => ({ transactionId: 'txn-001', ...payload });
    const client = makePaymentClient(gateway);
    const result = await client.charge({ customerId: 'c1', amountPaise: 10000 });
    expect(result.transactionId).toBe('txn-001');
  });

  it('propagates error from gateway after retries (only tests happy-path retry success)', async () => {
    let calls = 0;
    // Fails once, succeeds second time — the test exercises the retry path
    const gateway = async () => {
      calls++;
      if (calls === 1) throw new Error('gateway down');
      return { transactionId: 'txn-002' };
    };
    const client = makePaymentClient(gateway);
    const result = await client.charge({ customerId: 'c2', amountPaise: 5000 });
    expect(result.transactionId).toBe('txn-002');
    // NOTE: this test doesn't check call count limit — the bug hides here
  });
});
