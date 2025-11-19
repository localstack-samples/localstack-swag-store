import { Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Cors } from 'aws-cdk-lib/aws-apigateway';

interface ApiStackProps {
  productsTable: dynamodb.ITable;
  ordersTable?: dynamodb.ITable;
  orderQueue?: sqs.IQueue;
  notificationStateMachine?: sfn.IStateMachine;
}

export class ApiStack extends Construct {
  public readonly restApi: apigw.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);

    this.restApi = new apigw.RestApi(this, 'SwagStoreApi', {
      restApiName: 'LocalStack Swag Store API',
      deployOptions: { stageName: 'v1' },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS
      }
    });

    const listProductsLambda = new NodejsFunction(this, 'ListProductsLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'list-products', 'index.ts'),
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: false,
        externalModules: [],
      },
      environment: {
        PRODUCTS_TABLE: props.productsTable.tableName,
      },
      timeout: Duration.seconds(10),
    });

    props.productsTable.grantReadData(listProductsLambda);

    const products = this.restApi.root.addResource('products');
    products.addMethod('GET', new apigw.LambdaIntegration(listProductsLambda));

    // Output the API base URL
    new CfnOutput(this, 'ApiBaseUrl', {
      value: this.restApi.url ?? '',
      exportName: 'ApiBaseUrl',
    });

    // create-order Lambda and route
    const createOrderLambda = new NodejsFunction(this, 'CreateOrderLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'create-order', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
        ORDER_QUEUE_URL: props.orderQueue ? props.orderQueue.queueUrl : '',
        EMAIL_STATE_MACHINE_ARN: props.notificationStateMachine ? props.notificationStateMachine.stateMachineArn : '',
      },
      timeout: Duration.seconds(10),
    });
    if (props.ordersTable) props.ordersTable.grantWriteData(createOrderLambda);
    if (props.orderQueue) props.orderQueue.grantSendMessages(createOrderLambda);
    if (props.notificationStateMachine) props.notificationStateMachine.grantStartExecution(createOrderLambda);

    const orders = this.restApi.root.addResource('orders');
    orders.addMethod('POST', new apigw.LambdaIntegration(createOrderLambda));

    // get-order Lambda and route
    const getOrderLambda = new NodejsFunction(this, 'GetOrderLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'get-order', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
      },
      timeout: Duration.seconds(10),
    });
    if (props.ordersTable) props.ordersTable.grantReadData(getOrderLambda);

    const orderById = orders.addResource('{orderId}');
    orderById.addMethod('GET', new apigw.LambdaIntegration(getOrderLambda));

    // Admin routes
    const admin = this.restApi.root.addResource('admin');
    const adminOrders = admin.addResource('orders');

    const listOrdersLambda = new NodejsFunction(this, 'ListOrdersLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'admin', 'list-orders', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
      },
      timeout: Duration.seconds(10),
    });
    if (props.ordersTable) props.ordersTable.grantReadData(listOrdersLambda);
    adminOrders.addMethod('GET', new apigw.LambdaIntegration(listOrdersLambda));

    const fulfill = adminOrders.addResource('fulfill');
    const fulfillOrderLambda = new NodejsFunction(this, 'FulfillOrderLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'admin', 'fulfill-order', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
        PRODUCTS_TABLE: props.productsTable.tableName,
        EMAIL_STATE_MACHINE_ARN: props.notificationStateMachine ? props.notificationStateMachine.stateMachineArn : '',
      },
      timeout: Duration.seconds(15),
    });
    if (props.ordersTable) props.ordersTable.grantReadWriteData(fulfillOrderLambda);
    props.productsTable.grantReadWriteData(fulfillOrderLambda);
    if (props.notificationStateMachine) props.notificationStateMachine.grantStartExecution(fulfillOrderLambda);
    fulfill.addMethod('POST', new apigw.LambdaIntegration(fulfillOrderLambda));

    const reject = adminOrders.addResource('reject');
    const rejectOrderLambda = new NodejsFunction(this, 'RejectOrderLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'admin', 'reject-order', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
        EMAIL_STATE_MACHINE_ARN: props.notificationStateMachine ? props.notificationStateMachine.stateMachineArn : '',
      },
      timeout: Duration.seconds(10),
    });
    if (props.ordersTable) props.ordersTable.grantReadWriteData(rejectOrderLambda);
    if (props.notificationStateMachine) props.notificationStateMachine.grantStartExecution(rejectOrderLambda);
    reject.addMethod('POST', new apigw.LambdaIntegration(rejectOrderLambda));

    const inventory = admin.addResource('inventory');
    const adjust = inventory.addResource('adjust');
    const adjustInventoryLambda = new NodejsFunction(this, 'AdjustInventoryLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'admin', 'adjust-inventory', 'index.ts'),
      handler: 'handler',
      environment: {
        PRODUCTS_TABLE: props.productsTable.tableName,
      },
      timeout: Duration.seconds(10),
    });
    props.productsTable.grantReadWriteData(adjustInventoryLambda);
    adjust.addMethod('POST', new apigw.LambdaIntegration(adjustInventoryLambda));

    const stats = admin.addResource('stats');
    const getStatsLambda = new NodejsFunction(this, 'GetStatsLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', '..', 'src', 'lambdas', 'api', 'admin', 'get-stats', 'index.ts'),
      handler: 'handler',
      environment: {
        ORDERS_TABLE: props.ordersTable ? props.ordersTable.tableName : 'orders',
        PRODUCTS_TABLE: props.productsTable.tableName,
      },
      timeout: Duration.seconds(10),
    });
    if (props.ordersTable) props.ordersTable.grantReadData(getStatsLambda);
    props.productsTable.grantReadData(getStatsLambda);
    stats.addMethod('GET', new apigw.LambdaIntegration(getStatsLambda));
  }
}


