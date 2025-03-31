import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as NextjsStack from '../lib/nextjs-stack';

describe('NextjsStack', () => {
  let app: cdk.App;
  let stack: NextjsStack.NextjsStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    // Create stack for dev environment
    stack = new NextjsStack.NextjsStack(app, 'TestStack', {
      environment: 'dev',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('VPC Created with Correct Configuration', () => {
    // Test VPC creation
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private subnets
    template.resourceCountIs('AWS::EC2::NatGateway', 1); // 1 NAT Gateway for dev

    // Test VPC has correct CIDR
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test('ECS Cluster Created with Container Insights', () => {
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterName: 'nextjs-cluster-dev',
      ClusterSettings: [
        {
          Name: 'containerInsights',
          Value: 'enabled',
        },
      ],
    });
  });

  test('Fargate Service Created with Correct Configuration', () => {
    // Test Fargate Service
    template.resourceCountIs('AWS::ECS::Service', 1);
    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 1, // Dev environment should have 1 task
      LaunchType: 'FARGATE',
    });

    // Test Task Definition
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Essential: true,
          PortMappings: [
            {
              ContainerPort: 3000,
              Protocol: 'tcp',
            },
          ],
          Environment: [
            {
              Name: 'NODE_ENV',
              Value: 'dev',
            },
            {
              Name: 'PORT',
              Value: '3000',
            },
          ],
        },
      ],
      Cpu: '512', // Dev environment CPU
      Memory: '1024', // Dev environment Memory
    });
  });

  test('ALB Created with Correct Configuration', () => {
    // Test ALB creation
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Name: 'nextjs-alb-dev',
      Scheme: 'internet-facing',
      Type: 'application',
    });

    // Test Target Group
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckIntervalSeconds: 30,
      HealthCheckPath: '/',
      HealthCheckTimeoutSeconds: 5,
      Matcher: { HttpCode: '200' },
      Port: 80,
      Protocol: 'HTTP',
      TargetType: 'ip',
    });
  });

  test('Security Groups Created with Correct Rules', () => {
    // Test ALB Security Group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: [
        {
          CidrIp: '0.0.0.0/0',
          FromPort: 80,
          IpProtocol: 'tcp',
          ToPort: 80,
        },
      ],
    });

    // Count security groups (ALB + ECS Service)
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });

  test('Environment Specific Configuration for Dev', () => {
    // Test dev-specific configurations
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '512',
      Memory: '1024',
    });

    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 1,
    });
  });
});

// Test production environment configuration
describe('NextjsStack Production', () => {
  let prodTemplate: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const prodStack = new NextjsStack.NextjsStack(app, 'ProdTestStack', {
      environment: 'prod',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    prodTemplate = Template.fromStack(prodStack);
  });

  test('Production Environment Has Correct Configuration', () => {
    // Test prod-specific configurations
    prodTemplate.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '1024',
      Memory: '2048',
    });

    prodTemplate.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 2,
    });

    // Test prod has 2 NAT Gateways
    prodTemplate.resourceCountIs('AWS::EC2::NatGateway', 2);
  });
}); 