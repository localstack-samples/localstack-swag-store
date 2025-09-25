import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class AssetsStack extends Construct {
  public readonly imageBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.imageBucket = new s3.Bucket(this, 'SwagStoreImageAssetsBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const imagesPath = path.join(__dirname, '..', '..', 'assets');
    new s3deploy.BucketDeployment(this, 'DeployImageAssets', {
      destinationBucket: this.imageBucket,
      sources: [s3deploy.Source.asset(imagesPath)],
    });

    // Output is emitted in main-stack.ts to keep outputs centralized
  }
}


