import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event: any) => {
  for (const record of event.Records || []) {
    try {
      const msg = JSON.parse(record.body || '{}');
      const orderId = msg.orderId;
      if (!orderId) continue;

      const orderRes = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }));
      const order = orderRes.Item;
      if (!order) continue;

      const items = Array.isArray(order.items) ? order.items : [];
      let totalRequired = 0;
      for (const it of items) {
        const productId = it?.productId;
        const qty = Number(it?.quantity || 1);
        if (!productId) continue;
        const prodRes = await docClient.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } }));
        const product = prodRes.Item;
        const requiredCoins = Number(product?.requiredCoins || 0);
        totalRequired += requiredCoins * qty;
      }

      const claimedCoinCount = Number(order.claimedCoinCount || 0);
      const newStatus = claimedCoinCount >= totalRequired && totalRequired > 0 ? 'PENDING_VERIFICATION' : 'FAILED_INSUFFICIENT_COINS';

      await docClient.send(new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId },
        UpdateExpression: 'SET #s = :s, updatedAt = :u',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': newStatus, ':u': new Date().toISOString() },
      }));
    } catch (err: any) {
      console.error('Error processing record:', err?.message || err);
      throw err;
    }
  }
};
