import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { orderId } = body || {};
    if (!orderId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing orderId' }) };
    }

    const orderRes = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }));
    const order = orderRes.Item;
    if (!order) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not found' }) };
    }
    if (order.status !== 'PENDING_VERIFICATION') {
      return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order not in PENDING_VERIFICATION' }) };
    }

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Order has no items' }) };
    }

    // Read all products to capture current version for optimistic locking
    const products: Record<string, any> = {};
    for (const it of items) {
      const productId = it?.productId;
      if (!productId) continue;
      if (products[productId]) continue; // de-dup
      const prodRes = await docClient.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } }));
      if (!prodRes.Item) {
        return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Product not found: ${productId}` }) };
      }
      products[productId] = prodRes.Item;
    }

    // Build transact writes: decrement stock and bump version for each product, and set order fulfilled
    const TransactItems: any[] = [];
    for (const it of items) {
      const productId = it.productId;
      const qty = Number(it.quantity || 1);
      const current = products[productId];
      const currentVersion = Number(current?.version || 1);
      TransactItems.push({
        Update: {
          TableName: PRODUCTS_TABLE,
          Key: { productId },
          UpdateExpression: 'SET stock = stock - :q, version = version + :one',
          ConditionExpression: 'attribute_exists(productId) AND stock >= :q AND version = :v',
          ExpressionAttributeValues: {
            ':q': qty,
            ':one': 1,
            ':v': currentVersion,
          },
        },
      });
    }

    TransactItems.push({
      Update: {
        TableName: ORDERS_TABLE,
        Key: { orderId },
        UpdateExpression: 'SET #s = :s, updatedAt = :u',
        ConditionExpression: '#s = :expected',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':s': 'FULFILLED',
          ':expected': 'PENDING_VERIFICATION',
          ':u': new Date().toISOString(),
        },
      },
    });

    await docClient.send(new TransactWriteCommand({ TransactItems }));

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, newStatus: 'FULFILLED' }) };
  } catch (err: any) {
    console.error('Fulfillment failed:', err?.message || err);
    return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Fulfillment failed. Item may be out of stock or order is in an invalid state.' }) };
  }
};
