import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders'
const EMAIL_STATE_MACHINE_ARN = process.env.EMAIL_STATE_MACHINE_ARN || ''
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'

const ddb = new DynamoDBClient({ region })
const docClient = DynamoDBDocumentClient.from(ddb)
const sfn = new SFNClient({ region })

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {}
    const { orderId, reason } = body || {}
    if (!orderId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing orderId' }) }
    }

    const res = await docClient.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }))
    const order = res.Item as any
    if (!order) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Order not found' }) }
    }
    if (order.status !== 'PENDING_VERIFICATION') {
      return { statusCode: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Order not in PENDING_VERIFICATION' }) }
    }

    await docClient.send(new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: 'SET #s = :s, rejectionReason = :r, updatedAt = :u',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'REJECTED', ':r': reason || 'Rejected by admin', ':u': new Date().toISOString(), ':expected': 'PENDING_VERIFICATION' },
      ConditionExpression: '#s = :expected',
    }))

    if (EMAIL_STATE_MACHINE_ARN) {
      const input = {
        toAddress: [order.attendeeEmail],
        subject: `Your LocalStack Swag Order #${order.orderId} was rejected`,
        htmlBody: `<h1>Update for your order, ${order.attendeeName}</h1><p>Your order was not approved at this time.${reason ? ` Reason: ${String(reason)}` : ''}</p>`,
      }
      sfn
        .send(
          new StartExecutionCommand({ stateMachineArn: EMAIL_STATE_MACHINE_ARN, input: JSON.stringify(input) })
        )
        .catch((e) => console.warn('Failed to start email state machine (reject):', e?.message || e))
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, newStatus: 'REJECTED' }) }
  } catch (err: any) {
    console.error('Reject failed:', err?.message || err)
    return { statusCode: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Reject failed' }) }
  }
}


