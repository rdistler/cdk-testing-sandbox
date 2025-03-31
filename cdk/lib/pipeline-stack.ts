import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { NextjsStage } from '../lib/nextjs-stage';

export interface PipelineStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  branchName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Create the pipeline
    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: 'NextjsAppPipeline',
      synth: new pipelines.CodeBuildStep('Synth', {
        input: pipelines.CodePipelineSource.gitHub(
          `${props.githubOwner}/${props.githubRepo}`,
          props.branchName,
          {
            // You'll need to store this secret in AWS Secrets Manager
            // with the name 'github-token'
            authentication: cdk.SecretValue.secretsManager('github-token'),
          }
        ),
        // installCommands: [
        //   'npm install',
        // ],
        commands: [
          'ls -la',
          'pwd',
          'cd cdk',
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'cdk/cdk.out'
      }),
    });

    // Add stages for different environments
    pipeline.addStage(new NextjsStage(this, 'Dev', {
      environment: 'dev',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    }));

    // Add production stage with manual approval
    const prod = pipeline.addStage(new NextjsStage(this, 'Prod', {
      environment: 'prod',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    }));

    // Add manual approval before production deployment
    prod.addPre(new pipelines.ManualApprovalStep('PromoteToProd'));
  }
} 