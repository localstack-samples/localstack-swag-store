import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event: any) => {
  try {
    const orderId = event.pathParameters?.orderId;
    if (!orderId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing orderId' }) };
    }

    const res = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }));
    if (!res.Item) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Not Found' }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ order: res.Item }) };
  } catch (err: any) {
    console.error('Error getting order:', err?.message || err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
