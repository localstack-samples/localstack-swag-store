import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const ORDER_QUEUE_URL = process.env.ORDER_QUEUE_URL || '';
const EMAIL_STATE_MACHINE_ARN = process.env.EMAIL_STATE_MACHINE_ARN || '';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ddb = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddb);
const sqs = new SQSClient({ region });
const sfn = new SFNClient({ region });

interface OrderItem {
  orderId: string;
  attendeeName?: string;
  attendeeEmail?: string;
  [key: string]: any;
}

const parsePayload = (recordBody?: string): any => {
  if (!recordBody) return undefined;
  try {
    const parsed = JSON.parse(recordBody);
    if (parsed?.Type === 'Notification' && parsed?.Message) {
      return typeof parsed.Message === 'string' ? JSON.parse(parsed.Message) : parsed.Message;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse retry payload:', err);
    return undefined;
  }
};

const triggerOrderPlacedEmail = async (order: OrderItem) => {
  if (!EMAIL_STATE_MACHINE_ARN || !order.attendeeEmail) {
    return;
  }
  const input = {
    toAddress: [order.attendeeEmail],
    subject: `Your LocalStack Swag Order #${order.orderId} has been placed!`,
    htmlBody: `<h1>Thank you, ${order.attendeeName || 'there'}!</h1><p>Your order has been placed and is now being processed. You will receive another email once it is ready for pickup at the booth.</p>`,
  };
  try {
    await sfn.send(new StartExecutionCommand({
      stateMachineArn: EMAIL_STATE_MACHINE_ARN,
      input: JSON.stringify(input),
    }));
  } catch (err) {
    console.warn('Retry lambda failed to start email state machine:', err);
  }
};

const enqueueOrderForProcessing = async (orderId: string) => {
  if (!ORDER_QUEUE_URL) return;
  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: ORDER_QUEUE_URL,
      MessageBody: JSON.stringify({ orderId }),
    }));
  } catch (err) {
    console.warn('Retry lambda failed to enqueue order:', err);
  }
};

export const handler = async (event: any) => {
  for (const record of event?.Records || []) {
    const payload = parsePayload(record?.body);
    if (!payload) continue;

    const order: OrderItem | undefined = payload.order ?? payload;
    if (!order?.orderId) {
      console.warn('Retry lambda received payload without orderId');
      continue;
    }

    let created = false;
    try {
      await docClient.send(new PutCommand({
        TableName: ORDERS_TABLE,
        Item: order,
        ConditionExpression: 'attribute_not_exists(orderId)',
      }));
      created = true;
    } catch (err: any) {
      if (err?.name === 'ConditionalCheckFailedException') {
        console.info(`Order ${order.orderId} already exists, skipping rewrite.`);
      } else {
        console.error(`Retry lambda failed to persist order ${order.orderId}:`, err?.message || err);
        throw err;
      }
    }

    if (!created) {
      continue;
    }

    await triggerOrderPlacedEmail(order);
    await enqueueOrderForProcessing(order.orderId);
  }
};

