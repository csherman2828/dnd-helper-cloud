import { Duration, Stack } from 'aws-cdk-lib';
import {
  ContainerImage,
  FargateTaskDefinition,
  FargateService,
  AwsLogDriver,
  Cluster,
} from 'aws-cdk-lib/aws-ecs';
import { SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
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
import { ITable } from 'aws-cdk-lib/aws-dynamodb';

interface ApiStackProps {
  github: {
    owner: string;
    repo: string;
    branch: string;
    codestarConnectionArn: string;
  };
  ecrRepo: IRepository;
  hostedZoneDomain: string;
  subdomain: string;
  region: string;
  table: ITable;
}

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const EXPRESS_PORT = 3000;

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);

    const { ecrRepo, github, region, subdomain, hostedZoneDomain, table } =
      props;

    const fullDomainName = `${subdomain}.${hostedZoneDomain}`;

    // Use no NAT Gateways to avoid unnecessary costs
    // I'd definitely take this on as a cost given revenue, but when I'm hosting
    //   this for fun, I don't want to pay for it
    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
      ],
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

    // ECS Task Definition
    const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Grant the ECS task role access to the DynamoDB table
    table.grantReadWriteData(taskDefinition.taskRole);

    const container = taskDefinition.addContainer('ExpressContainer', {
      image: ContainerImage.fromEcrRepository(ecrRepo),
      logging: new AwsLogDriver({
        streamPrefix: 'ExpressApp',
        logRetention: RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: `${EXPRESS_PORT}`,
      },
    });
    container.addPortMappings({ containerPort: EXPRESS_PORT });

    // ECS Service
    const ecsService = new FargateService(this, 'Service', {
      cluster: ecsCluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [loadBalancerSecurityGroup],
      assignPublicIp: true,
    });

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: hostedZoneDomain,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: fullDomainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const httpsListener = loadBalancer.addListener('HttpsListener', {
      port: HTTPS_PORT,
      open: true,
      certificates: [certificate],
    });

    loadBalancer.addListener('HttpListener', {
      port: HTTP_PORT,
      open: true,
      defaultAction: ListenerAction.redirect({
        protocol: 'HTTPS',
        port: `${HTTPS_PORT}`,
        permanent: true,
      }),
    });

    httpsListener.addTargets('TargetGroup', {
      protocol: ApplicationProtocol.HTTP,
      port: EXPRESS_PORT,
      targets: [ecsService],
      healthCheck: {
        path: '/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    new ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: fullDomainName,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
    });

    new ImageRepoDeployment(this, 'Deployment', {
      ecrRepo,
      ecsService,
      github,
      region,
    });
  }
}
