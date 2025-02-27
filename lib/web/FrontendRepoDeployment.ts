import { Construct } from 'constructs';
import {
  CodeBuildAction,
  S3DeployAction,
  CodeStarConnectionsSourceAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  PipelineProject,
  BuildSpec,
  LinuxBuildImage,
} from 'aws-cdk-lib/aws-codebuild';
import { IBucket } from 'aws-cdk-lib/aws-s3';

interface FrontendRepoDeploymentProps {
  bucket: IBucket;
  github: {
    owner: string;
    repo: string;
    branch: string;
    codestarConnectionArn: string;
  };
}

class FrontendRepoDeployment extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: FrontendRepoDeploymentProps,
  ) {
    super(scope, id);

    const { bucket, github } = props;

    const sourceArtifact = new Artifact();
    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      owner: github.owner,
      repo: github.repo,
      branch: github.branch,
      connectionArn: github.codestarConnectionArn,
      triggerOnPush: true,
      output: sourceArtifact,
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
      bucket: bucket,
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

export default FrontendRepoDeployment;
export type { FrontendRepoDeploymentProps };
