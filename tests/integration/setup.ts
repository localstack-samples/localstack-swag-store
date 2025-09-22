import axios from 'axios';
import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway';

function sanitizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

async function discoverFromApiGw(): Promise<string> {
  const client = new APIGatewayClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  const apis = await client.send(new GetRestApisCommand({ limit: 50 }));
  const items = apis.items || [];
  if (!items.length) throw new Error('No REST APIs found in LocalStack. Deploy CDK first.');
  const api = items.find((a: any) => a.name === 'LocalStack Swag Store API') || items[0];
  const id = api!.id as string;
  const httpsUrl = `https://${id}.execute-api.localhost.localstack.cloud:4566/v1`;
  await axios.get(`${httpsUrl}/products`);
  return httpsUrl;
}

beforeAll(async () => {
  const url = await discoverFromApiGw();
  process.env.API_URL = sanitizeBaseUrl(url);
  console.log(`[setup] Using API_URL: ${process.env.API_URL}`);
});
