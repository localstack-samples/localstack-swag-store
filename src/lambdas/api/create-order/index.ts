import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ulid } from 'ulid';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const ORDER_QUEUE_URL = process.env.ORDER_QUEUE_URL || '';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);
const sqs = new SQSClient({ region });

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { name, email, items, coinCount } = body || {};

    if (!name || !email || !Array.isArray(items) || items.length === 0 || typeof coinCount !== 'number') {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const orderId = ulid();
    const now = new Date().toISOString();

    const orderItem = {
      orderId,
      attendeeName: name,
      attendeeEmail: email,
      items,
      claimedCoinCount: coinCount,
      status: 'PLACED',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: orderItem }));

    if (!ORDER_QUEUE_URL) {
      console.warn('ORDER_QUEUE_URL not configured; skipping enqueue');
    } else {
      await sqs.send(new SendMessageCommand({ QueueUrl: ORDER_QUEUE_URL, MessageBody: JSON.stringify({ orderId }) }));
    }

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: 'PLACED' }),
    };
  } catch (err: any) {
    console.error('Error creating order:', err?.message || err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
