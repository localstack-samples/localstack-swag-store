import axios from 'axios';
import { createOrder, waitForOrderStatus } from './lib/test-utils';

const LOCALSTACK_ENDPOINT = (process.env.AWS_ENDPOINT_URL || 'http://localhost:4566').replace(/\/$/, '');
const CHAOS_FAULTS_URL = `${LOCALSTACK_ENDPOINT}/_localstack/chaos/faults`;

async function configureChaosFaults(rules: any[]): Promise<void> {
  await axios.post(CHAOS_FAULTS_URL, rules);
}

describe('Chaos resiliency - DynamoDB outage', () => {
  jest.setTimeout(120000);

  afterAll(async () => {
    await configureChaosFaults([]);
  });

  test('orders are queued during outage and recovered after chaos is cleared', async () => {
    const outageRules = [
      {
        service: 'dynamodb',
        region: 'us-east-1',
        error: {
          statusCode: 500,
          code: 'ChaosDynamoOutage',
        },
      },
    ];

    await configureChaosFaults(outageRules);

    const payload = {
      name: 'Chaos Tester',
      email: `chaos-${Date.now()}@example.com`,
      items: [{ productId: 'p-sticker-pack-1', quantity: 1 }],
      coinCount: 1,
    };

    let orderId: string | undefined;
    try {
      const { data, status } = await createOrder(payload);
      orderId = data?.orderId;

      expect(status).toBe(202);
      expect(orderId).toBeDefined();
      expect(data.status).toBe('QUEUED_FOR_RETRY');
      expect(data.queuedForRetry).toBe(true);
    } finally {
      await configureChaosFaults([]);
    }

    const recoveredOrder = await waitForOrderStatus(orderId!, 'PENDING_VERIFICATION', 90000);
    expect(recoveredOrder.status).toBe('PENDING_VERIFICATION');
  });
});

