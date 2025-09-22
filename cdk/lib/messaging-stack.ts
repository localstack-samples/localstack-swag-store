import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';

export class MessagingStack extends Construct {
  public readonly orderProcessingQueue: sqs.Queue;
  public readonly orderProcessingDlq: sqs.Queue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.orderProcessingDlq = new sqs.Queue(this, 'OrderProcessingDLQ', {
      queueName: 'order-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    this.orderProcessingQueue = new sqs.Queue(this, 'OrderProcessingQueue', {
      queueName: 'order-processing-queue',
      deadLetterQueue: {
        queue: this.orderProcessingDlq,
        maxReceiveCount: 3,
      },
    });
  }
}


