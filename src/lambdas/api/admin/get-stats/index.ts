import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async () => {
  try {
    const ordersRes = await docClient.send(new ScanCommand({ TableName: ORDERS_TABLE, ProjectionExpression: '#s', ExpressionAttributeNames: { '#s': 'status' } }));
    const counts: Record<string, number> = {};
    for (const it of ordersRes.Items || []) {
      const s = it.status as string;
      counts[s] = (counts[s] || 0) + 1;
    }

    const productsRes = await docClient.send(new ScanCommand({ TableName: PRODUCTS_TABLE, ProjectionExpression: 'productId, stock' }));
    const inventory: Record<string, number> = {};
    for (const p of productsRes.Items || []) {
      inventory[p.productId as string] = Number(p.stock || 0);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ordersPlaced: Object.values(counts).reduce((a, b) => a + b, 0), statusCounts: counts, inventory }),
    };
  } catch (err: any) {
    console.error('Error getting stats:', err?.message || err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
