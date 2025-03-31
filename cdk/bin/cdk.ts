#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// For local development and testing
if (process.env.LOCAL_DEVELOPMENT === 'true') {
  const { NextjsStack } = require('../lib/nextjs-stack');
  new NextjsStack(app, 'NextjsStackDev', {
    environment: 'dev',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
} else {
  // Deploy the pipeline in production
  new PipelineStack(app, 'NextjsPipelineStack', {
    githubOwner: 'rdistler',  // Replace with your GitHub username
    githubRepo: 'cdk-testing-sandbox',    // Replace with your repository name
    branchName: 'main',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
}

app.synth();