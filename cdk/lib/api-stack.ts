import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface ApiStackProps extends StackProps {
  productsTable: dynamodb.ITable;
}

export class ApiStack extends Stack {
  public readonly restApi: apigw.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.restApi = new apigw.RestApi(this, 'SwagStoreApi', {
      restApiName: 'LocalStack Swag Store API',
      deployOptions: { stageName: 'v1' },
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
  }
}


