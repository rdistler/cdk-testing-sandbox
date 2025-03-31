import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as path from 'path';
import { Construct } from 'constructs';

export interface NextjsStackProps extends cdk.StackProps {
  environment: string;
}

export class NextjsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextjsStackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'NextjsVpc', {
      maxAzs: 2,
      natGateways: props.environment === 'prod' ? 2 : 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'NextjsCluster', {
      vpc,
      clusterName: `nextjs-cluster-${props.environment}`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Create Fargate Service with ALB
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'NextjsService', {
      cluster,
      memoryLimitMiB: props.environment === 'prod' ? 2048 : 1024,
      cpu: props.environment === 'prod' ? 1024 : 512,
      desiredCount: props.environment === 'prod' ? 2 : 1,
      loadBalancerName: `nextjs-alb-${props.environment}`,
      publicLoadBalancer: true,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../apps/web/my-app'), {
          // Optional: Add build args if needed
          buildArgs: {
            NODE_ENV: props.environment,
          }
        }),
        containerPort: 3000,
        environment: {
          NODE_ENV: props.environment,
          PORT: '3000',
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'nextjs',
        }),
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: { rollback: true },
    });

    // Configure health check
    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
    });

    // Output the ALB DNS name
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
      exportName: `${props.environment}-alb-dns`,
    });
  }
} 