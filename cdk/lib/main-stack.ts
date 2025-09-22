import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';
import { MessagingStack } from './messaging-stack';
import { ApiStack } from './api-stack';

export class MainStack extends cdk.Stack {
  public readonly data: DataStack;
  public readonly messaging: MessagingStack;
  public readonly api: ApiStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.data = new DataStack(this, 'Data');
    this.messaging = new MessagingStack(this, 'Messaging', {
      ordersTable: this.data.ordersTable,
      productsTable: this.data.productsTable,
    });

    this.api = new ApiStack(this, 'Api', {
      productsTable: this.data.productsTable,
      ordersTable: this.data.ordersTable,
      orderQueue: this.messaging.orderProcessingQueue,
    });
  }
}


