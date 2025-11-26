import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const endpoint = process.env.AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT || 'https://localhost.localstack.cloud';

  const ddbClient = new DynamoDBClient({ region, endpoint });
  const docClient = DynamoDBDocumentClient.from(ddbClient);

  const seedPath = join(__dirname, '..', 'infra', 'seed', 'swag.json');
  try {
    const file = readFileSync(seedPath, 'utf-8');
    const items = JSON.parse(file);
    if (!Array.isArray(items)) throw new Error('Seed file must be an array of products');

    const chunkSize = 25;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const putRequests = chunk.map((Item: any) => ({ PutRequest: { Item } }));
      const cmd = new BatchWriteCommand({
        RequestItems: {
          products: putRequests,
        },
      });
      const res = await docClient.send(cmd);
      if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) {
        console.warn('Some items were unprocessed, retrying once...', res.UnprocessedItems);
        const retryCmd = new BatchWriteCommand({ RequestItems: res.UnprocessedItems });
        await docClient.send(retryCmd);
      }
    }

    console.log(`Seeded products table with ${items.length} items.`);
  } catch (err: any) {
    console.error('Failed to seed products:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
