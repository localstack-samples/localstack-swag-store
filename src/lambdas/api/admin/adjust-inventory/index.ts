import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { productId, quantity } = body || {};
    if (!productId || typeof quantity !== 'number') {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'productId and quantity are required' }) };
    }

    const res = await docClient.send(new UpdateCommand({
      TableName: PRODUCTS_TABLE,
      Key: { productId },
      UpdateExpression: 'SET stock = :q, version = if_not_exists(version, :zero) + :one',
      ExpressionAttributeValues: { ':q': quantity, ':zero': 0, ':one': 1 },
      ConditionExpression: 'attribute_exists(productId)',
      ReturnValues: 'UPDATED_NEW',
    }));

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, newStock: quantity }) };
  } catch (err: any) {
    console.error('Adjust inventory failed:', err?.message || err);
    return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Adjust inventory failed' }) };
  }
};
