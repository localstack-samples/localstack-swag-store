import { Stack, StackProps, aws_iam as iam, aws_stepfunctions as sfn } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface NotificationsStackProps extends StackProps {
}

export class NotificationsStack extends Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props?: NotificationsStackProps) {
    super(scope, id, props);

    const fromEmail = 'admin@localstack.cloud';

    const smPath = path.join(__dirname, '..', '..', 'infra', 'email-statemachine.json');
    const definitionRaw = fs.readFileSync(smPath, 'utf8');
    const definitionWithEnv = definitionRaw.replace(/\$\{FROM_EMAIL_ADDRESS\}/g, fromEmail);

    this.stateMachine = new sfn.StateMachine(this, 'EmailNotificationStateMachine', {
      stateMachineName: 'EmailNotificationStateMachine',
      definitionBody: sfn.DefinitionBody.fromString(definitionWithEnv),
    });

    // Allow Step Functions to send emails via SES
    this.stateMachine.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail', 'ses:SendBulkTemplatedEmail'],
      resources: ['*'],
    }));

    // Verify SES email identity via Custom Resource
    const emailsToVerify = [fromEmail];
    for (const email of emailsToVerify) {
      const sanitised = email.replace(/\./g, '-').replace(/@/g, '-');
      new cr.AwsCustomResource(this, `VerifySesEmailIdentity${sanitised}`, {
        onUpdate: {
          service: 'SES',
          action: 'verifyEmailIdentity',
          parameters: { EmailAddress: email },
          physicalResourceId: cr.PhysicalResourceId.of(`verify-${sanitised}`),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });
    }
  }
}


