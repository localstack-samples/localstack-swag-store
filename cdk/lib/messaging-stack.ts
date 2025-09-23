import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

export class MessagingStack extends Construct {
  public readonly orderProcessingQueue: sqs.Queue;
  public readonly orderProcessingDlq: sqs.Queue;
  public readonly processOrderLambda: lambda.Function;

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
      runtime: lambda.Runtime.NODEJS_22_X,
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
  }
}


