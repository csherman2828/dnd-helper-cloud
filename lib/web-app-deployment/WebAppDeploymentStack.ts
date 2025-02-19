import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import {
  Distribution,
  HttpVersion,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  CodeBuildAction,
  S3DeployAction,
  CodeStarConnectionsSourceAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import { PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  PipelineProject,
  BuildSpec,
  LinuxBuildImage,
} from 'aws-cdk-lib/aws-codebuild';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

interface WebAppDeploymentStackProps extends StackProps {
  hostedZoneDomainName: string;
  domainName: string;
  repo: {
    owner: string;
    name: string;
    branch: string;
    codeConnectionArn: string;
  };
}

export class WebAppDeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props: WebAppDeploymentStackProps) {
    super(scope, id, props);

    const { hostedZoneDomainName, domainName, repo } = props;

    const webAppBucket = new Bucket(this, 'WebAppBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: hostedZoneDomainName,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const distribution = new Distribution(this, 'WebAppDistribution', {
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(webAppBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    webAppBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [webAppBucket.arnForObjects('*')],
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': distribution.distributionArn,
          },
        },
      }),
    );

    new ARecord(this, 'WebAppAliasRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    const sourceArtifact = new Artifact();
    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      owner: repo.owner,
      repo: repo.name,
      branch: repo.branch,
      output: sourceArtifact,
      connectionArn: repo.codeConnectionArn,
      triggerOnPush: true,
    });

    const buildProject = new PipelineProject(this, 'BuildProject', {
      buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
    });

    const buildArtifact = new Artifact();
    const buildAction = new CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceArtifact,
      outputs: [buildArtifact],
    });

    const deployAction = new S3DeployAction({
      actionName: 'Deploy',
      input: buildArtifact,
      bucket: webAppBucket,
    });

    // Pipeline definition
    new Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        {
          stageName: 'Deploy',
          actions: [deployAction],
        },
      ],
    });
  }
}
