import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class MessagingStack extends Construct {
  public readonly orderProcessingQueue: sqs.Queue;
  public readonly orderProcessingDlq: sqs.Queue;
  public readonly processOrderLambda: lambda.Function;
  public readonly orderWriteFailuresTopic: sns.Topic;
  public readonly orderWriteFailuresQueue: sqs.Queue;
  public readonly retryOrderWritesLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: { ordersTable?: dynamodb.ITable; productsTable?: dynamodb.ITable; notificationStateMachine?: sfn.IStateMachine }) {
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

    this.processOrderLambda = new NodejsFunction(this, 'ProcessOrderLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'workers', 'process-order', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props?.ordersTable ? props.ordersTable.tableName : 'orders',
        PRODUCTS_TABLE: props?.productsTable ? props.productsTable.tableName : 'products',
        EMAIL_STATE_MACHINE_ARN: props?.notificationStateMachine ? props.notificationStateMachine.stateMachineArn : '',
      },
      timeout: cdk.Duration.seconds(15),
    });

    this.processOrderLambda.addEventSource(new SqsEventSource(this.orderProcessingQueue));

    if (props?.ordersTable) {
      props.ordersTable.grantReadWriteData(this.processOrderLambda);
    }
    if (props?.productsTable) {
      props.productsTable.grantReadData(this.processOrderLambda);
    }
    if (props?.notificationStateMachine) {
      props.notificationStateMachine.grantStartExecution(this.processOrderLambda);
    }

    const orderWriteFailuresDlq = new sqs.Queue(this, 'OrderWriteFailuresDLQ', {
      queueName: 'order-write-failures-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    this.orderWriteFailuresQueue = new sqs.Queue(this, 'OrderWriteFailuresQueue', {
      queueName: 'order-write-failures-queue',
      visibilityTimeout: cdk.Duration.seconds(10),
      deadLetterQueue: {
        queue: orderWriteFailuresDlq,
        maxReceiveCount: 5,
      },
    });

    this.orderWriteFailuresTopic = new sns.Topic(this, 'OrderWriteFailuresTopic', {
      topicName: 'order-write-failures',
    });

    this.orderWriteFailuresTopic.addSubscription(new subscriptions.SqsSubscription(this.orderWriteFailuresQueue, {
      rawMessageDelivery: true,
    }));

    this.retryOrderWritesLambda = new NodejsFunction(this, 'RetryOrderWritesLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'workers', 'retry-order-write', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props?.ordersTable ? props.ordersTable.tableName : 'orders',
        ORDER_QUEUE_URL: this.orderProcessingQueue.queueUrl,
        EMAIL_STATE_MACHINE_ARN: props?.notificationStateMachine ? props.notificationStateMachine.stateMachineArn : '',
      },
      timeout: cdk.Duration.seconds(30),
    });

    this.retryOrderWritesLambda.addEventSource(new SqsEventSource(this.orderWriteFailuresQueue, {
      batchSize: 5,
    }));

    if (props?.ordersTable) {
      props.ordersTable.grantReadWriteData(this.retryOrderWritesLambda);
    }
    this.orderProcessingQueue.grantSendMessages(this.retryOrderWritesLambda);
    if (props?.notificationStateMachine) {
      props.notificationStateMachine.grantStartExecution(this.retryOrderWritesLambda);
    }
  }
}


