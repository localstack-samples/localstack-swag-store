import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';
import { MessagingStack } from './messaging-stack';

export class MainStack extends cdk.Stack {
  public readonly data: DataStack;
  public readonly messaging: MessagingStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.data = new DataStack(this, 'Data');
    this.messaging = new MessagingStack(this, 'Messaging');
  }
}


