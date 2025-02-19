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

const HOSTED_ZONE = 'shermaniac.com';
const DOMAIN_NAME = 'dnd.shermaniac.com';

export class WebAppDeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const webAppBucket = new Bucket(this, 'WebAppBucket', {
      bucketName: 'dnd-helper-web-prod',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: HOSTED_ZONE,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName: DOMAIN_NAME,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const distribution = new Distribution(this, 'WebAppDistribution', {
      domainNames: [DOMAIN_NAME],
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
      recordName: DOMAIN_NAME,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    // create a certificate for dnd.shermaniac.com
    // create a distribution pointing to the bucket
    // do the propper access control OAC
    // make sure dnd.shermaniac.com is one of the althernate domain names on the distribution
    // make sure index.html is the default root object
    // create a route53 record for dnd.shermaniac.com pointing to the distribution

    const sourceArtifact = new Artifact();
    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      owner: 'csherman2828',
      repo: 'dnd-helper-web',
      branch: 'main',
      output: sourceArtifact,
      connectionArn:
        'arn:aws:codeconnections:us-east-1:056680897227:connection/1e7e31d8-cb45-4cac-9d2d-aa59055e88bf',
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
