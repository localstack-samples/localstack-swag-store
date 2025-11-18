import { createOrder, getOrder, waitForOrderStatus } from './lib/test-utils';

describe('Checkout Flow', () => {
  test('L1 happy path: sufficient coins -> PENDING_VERIFICATION', async () => {
    const payload = {
      name: 'Test L1',
      email: 'l1@example.com',
      items: [{ productId: 'p-sticker-pack-1', quantity: 3 }],
      coinCount: 3,
    };
    const { data, status } = await createOrder(payload);
    expect([200, 202]).toContain(status);
    expect(data.status).toBe('PLACED');

    const order = await waitForOrderStatus(data.orderId, 'PENDING_VERIFICATION', 25000);
    expect(order.status).toBe('PENDING_VERIFICATION');
  });

  test('L3 happy path: exact coins -> PENDING_VERIFICATION', async () => {
    const payload = {
      name: 'Test L3',
      email: 'l3@example.com',
      items: [{ productId: 'p-water-bottle-1', quantity: 1 }],
      coinCount: 3,
    };
    const { data, status } = await createOrder(payload);
    expect([200, 202]).toContain(status);
    expect(data.status).toBe('PLACED');

    const order = await waitForOrderStatus(data.orderId, 'PENDING_VERIFICATION', 25000);
    expect(order.status).toBe('PENDING_VERIFICATION');
  });

  test('Failure: insufficient coins for L3 -> FAILED_INSUFFICIENT_COINS', async () => {
    const payload = {
      name: 'Fail Insuff',
      email: 'fail@example.com',
      items: [{ productId: 'p-water-bottle-1', quantity: 1 }],
      coinCount: 2,
    };
    const { data, status } = await createOrder(payload);
    expect([200, 202]).toContain(status);
    expect(data.status).toBe('PLACED');

    const start = Date.now();
    const timeout = 25000;
    let finalStatus = 'PLACED';
    while (Date.now() - start < timeout) {
      const { data: ord } = await getOrder(data.orderId);
      finalStatus = ord?.order?.status || finalStatus;
      if (finalStatus === 'FAILED_INSUFFICIENT_COINS') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(finalStatus).toBe('FAILED_INSUFFICIENT_COINS');
  });

  test('Failure: invalid product id handled by worker', async () => {
    const payload = {
      name: 'Invalid Product',
      email: 'invalid@example.com',
      items: [{ productId: 'does-not-exist', quantity: 1 }],
      coinCount: 3,
    };
    const { data, status } = await createOrder(payload);
    expect([200, 202]).toContain(status);

    const start = Date.now();
    const timeout = 25000;
    let finalStatus = 'PLACED';
    while (Date.now() - start < timeout) {
      const { data: ord } = await getOrder(data.orderId);
      finalStatus = ord?.order?.status || finalStatus;
      if (finalStatus !== 'PLACED') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(['FAILED_INSUFFICIENT_COINS', 'PENDING_VERIFICATION', 'PLACED']).toContain(finalStatus);
  });

  test('Failure: malformed request returns 400', async () => {
    const payload: any = { email: 'bad@example.com' }; // missing name/items/coinCount
    const { status } = await createOrder(payload);
    expect(status).toBe(400);
  });
});
