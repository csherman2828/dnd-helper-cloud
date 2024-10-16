import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
  S3DeployAction,
  CodeStarConnectionsSourceAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  PipelineProject,
  BuildSpec,
  LinuxBuildImage,
} from 'aws-cdk-lib/aws-codebuild';

export class WebAppDeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const webAppBucket = new Bucket(this, 'WebAppBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      publicReadAccess: true,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });

    const sourceArtifact = new Artifact();
    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      owner: 'csherman2828',
      repo: 'campaign-manager-vue',
      branch: 'main',
      output: sourceArtifact,
      connectionArn:
        'arn:aws:codeconnections:us-east-1:056680897227:connection/6a85089d-b782-45eb-95fb-0e1272d95c68',
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
