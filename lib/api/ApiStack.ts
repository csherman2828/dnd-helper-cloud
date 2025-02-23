import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  ContainerImage,
  FargateTaskDefinition,
  FargateService,
  AwsLogDriver,
  Cluster,
} from 'aws-cdk-lib/aws-ecs';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';

import { ImageRepoDeployment } from './ImageRepoDeployment';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ListenerAction,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

const DOMAIN_NAME = 'shermaniac.com';
const SUBDOMAIN_NAME = 'api.dnd';
const FULL_DOMAIN_NAME = `${SUBDOMAIN_NAME}.${DOMAIN_NAME}`;

interface ApiStackProps extends StackProps {
  githubSourceConfig: {
    owner: string;
    repo: string;
    branch: string;
    codestarConnectionArn: string;
  };
  ecrRepo: IRepository;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { ecrRepo, githubSourceConfig, env } = props;

    // Create a VPC with a single NAT Gateway (to stay in free tier)
    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create an ECS Cluster
    const ecsCluster = new Cluster(this, 'Cluster', { vpc });

    const loadBalancer = new ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
    });

    const loadBalancerSecurityGroup = new SecurityGroup(
      this,
      'LoadBalancerSecurityGroup',
      {
        vpc,
        allowAllOutbound: true,
      },
    );
    loadBalancerSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    // ECS Task Definition
    const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const container = taskDefinition.addContainer('ExpressContainer', {
      image: ContainerImage.fromEcrRepository(ecrRepo),
      logging: new AwsLogDriver({
        streamPrefix: 'ExpressApp',
        logRetention: RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    });
    container.addPortMappings({ containerPort: 3000 });

    // ECS Service
    const ecsService = new FargateService(this, 'Service', {
      cluster: ecsCluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [loadBalancerSecurityGroup],
      assignPublicIp: true,
    });

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: DOMAIN_NAME,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: FULL_DOMAIN_NAME,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const httpsListener = loadBalancer.addListener('HttpsListener', {
      port: 443,
      open: true,
      certificates: [certificate],
    });

    loadBalancer.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    httpsListener.addTargets('TargetGroup', {
      protocol: ApplicationProtocol.HTTP,
      port: 3000,
      targets: [ecsService],
      healthCheck: {
        path: '/health', // ✅ Must match the route in Express
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    new ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: FULL_DOMAIN_NAME,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
    });

    new ImageRepoDeployment(this, 'Deployment', {
      ecrRepo,
      ecsService,
      githubSourceConfig,
      env: env as { region: string },
    });
  }
}
