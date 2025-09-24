import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack';
import { MessagingStack } from './messaging-stack';
import { ApiStack } from './api-stack';
import { NotificationsStack } from './notifications-stack';
import { FrontendStack } from './frontend-stack';

export class MainStack extends cdk.Stack {
  public readonly data: DataStack;
  public readonly messaging: MessagingStack;
  public readonly api: ApiStack;
  public readonly notifications: NotificationsStack;
  public readonly frontend?: FrontendStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.data = new DataStack(this, 'Data');
    this.notifications = new NotificationsStack(this, 'Notifications');

    this.messaging = new MessagingStack(this, 'Messaging', {
      ordersTable: this.data.ordersTable,
      productsTable: this.data.productsTable,
      notificationStateMachine: this.notifications.stateMachine,
    });

    this.api = new ApiStack(this, 'Api', {
      productsTable: this.data.productsTable,
      ordersTable: this.data.ordersTable,
      orderQueue: this.messaging.orderProcessingQueue,
      notificationStateMachine: this.notifications.stateMachine,
    });


    // Wire state machine ARN to lambdas via environment variables
    this.api.node.children.forEach((child) => {
      // No-op here; environment is set inside ApiStack
    });

    // Frontend stack (gated by context)
    // Default: excluded. Enable with: -c includeFrontend=true
    const includeFrontendCtx = this.node.tryGetContext('includeFrontend')
    const includeFrontend = includeFrontendCtx !== undefined && String(includeFrontendCtx).toLowerCase() === 'true'

    if (includeFrontend) {
      this.frontend = new FrontendStack(this, 'Frontend', {})
      this.frontend.addDependency(this.api)
    }
  }
}
