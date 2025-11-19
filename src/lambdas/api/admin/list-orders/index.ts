import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event: any) => {
  try {
    const status = event.queryStringParameters?.status;
    const params: any = { TableName: ORDERS_TABLE };
    if (status) {
      params.FilterExpression = '#s = :s';
      params.ExpressionAttributeNames = { '#s': 'status' };
      params.ExpressionAttributeValues = { ':s': status };
    }
    const res = await docClient.send(new ScanCommand(params));
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ orders: res.Items || [] }) };
  } catch (err: any) {
    console.error('Error listing orders:', err?.message || err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
