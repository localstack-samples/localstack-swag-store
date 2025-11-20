import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ulid } from 'ulid';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const ORDER_QUEUE_URL = process.env.ORDER_QUEUE_URL || '';
const EMAIL_STATE_MACHINE_ARN = process.env.EMAIL_STATE_MACHINE_ARN || '';
const ORDER_WRITE_FAILURE_TOPIC_ARN = process.env.ORDER_WRITE_FAILURE_TOPIC_ARN || '';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);
const sqs = new SQSClient({ region });
const sfn = new SFNClient({ region });
const sns = new SNSClient({ region });

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { name, email, items, coinCount } = body || {};

    if (!name || !email || !Array.isArray(items) || items.length === 0 || typeof coinCount !== 'number') {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Invalid request body' }) };
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

    let primaryWriteSucceeded = false;
    let queuedForRetry = false;
    try {
      await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: orderItem }));
      primaryWriteSucceeded = true;
    } catch (err: any) {
      console.error('Failed to write order directly to DynamoDB:', err?.message || err);
      if (ORDER_WRITE_FAILURE_TOPIC_ARN) {
        await sns.send(new PublishCommand({
          TopicArn: ORDER_WRITE_FAILURE_TOPIC_ARN,
          Message: JSON.stringify({
            order: orderItem,
            reason: err?.message || 'unknown',
          }),
        }));
        queuedForRetry = true;
      } else {
        throw err;
      }
    }

    if (primaryWriteSucceeded) {
      if (EMAIL_STATE_MACHINE_ARN) {
        const input = {
          toAddress: [orderItem.attendeeEmail],
          subject: `Your LocalStack Swag Order #${orderItem.orderId} has been placed!`,
          htmlBody: `<h1>Thank you, ${orderItem.attendeeName}!</h1><p>Your order has been placed and is now being processed. You will receive another email once it is ready for pickup at the booth.</p>`,
        };
        sfn.send(new StartExecutionCommand({
          stateMachineArn: EMAIL_STATE_MACHINE_ARN,
          input: JSON.stringify(input),
        })).catch((e) => console.warn('Failed to start email state machine:', e?.message || e));
      } else {
        console.warn('EMAIL_STATE_MACHINE_ARN not configured; skipping email trigger');
      }

      if (!ORDER_QUEUE_URL) {
        console.warn('ORDER_QUEUE_URL not configured; skipping enqueue');
      } else {
        await sqs.send(new SendMessageCommand({ QueueUrl: ORDER_QUEUE_URL, MessageBody: JSON.stringify({ orderId }) }));
      }
    } else {
      console.warn(`Order ${orderId} queued for retry; awaiting DynamoDB recovery.`);
    }

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        orderId,
        status: queuedForRetry ? 'QUEUED_FOR_RETRY' : 'PLACED',
        queuedForRetry,
      }),
    };
  } catch (err: any) {
    console.error('Error creating order:', err?.message || err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
