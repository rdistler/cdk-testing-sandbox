import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NextjsStack } from './nextjs-stack';

export interface NextjsStageProps extends cdk.StageProps {
  environment: string;
}

export class NextjsStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: NextjsStageProps) {
    super(scope, id, props);

    new NextjsStack(this, 'NextjsStack', {
      environment: props.environment,
      env: props.env,
    });
  }
} 