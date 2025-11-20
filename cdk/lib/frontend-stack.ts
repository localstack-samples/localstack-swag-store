import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface FrontendStackProps extends cdk.StackProps {}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
      ],
    });

    cdk.Tags.of(this.distribution).add('_custom_id_', 'swagapp');

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: `https://${this.distribution.domainName}`,
    });

    // Build Vite app inside Docker at deploy-time and upload to S3
    const frontendPath = path.join(__dirname, '..', '..', 'src', 'frontend');
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      sources: [
        s3deploy.Source.asset(frontendPath, {
          bundling: ({
            local: {
              tryBundle(outputDir: string) {
                const env = {
                  ...process.env,
                  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
                } as NodeJS.ProcessEnv;
                try {
                  execSync('npm ci --no-audit --no-fund --include=dev', { cwd: frontendPath, stdio: 'inherit', env });
                  execSync('npm run build', { cwd: frontendPath, stdio: 'inherit', env });
                  fs.cpSync(path.join(frontendPath, 'dist'), outputDir, { recursive: true });
                  return true;
                } catch (e: any) {
                  throw new Error(`Local frontend build failed: ${e?.message || e}`);
                }
              },
            },
          } as any),
        }),
      ],
    });
  }
}
