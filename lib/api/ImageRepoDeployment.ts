import { Construct } from 'constructs';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import { IBaseService } from 'aws-cdk-lib/aws-ecs';
import { StackProps } from 'aws-cdk-lib';
import {
  PipelineProject,
  LinuxBuildImage,
  BuildSpec,
} from 'aws-cdk-lib/aws-codebuild';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
  CodeStarConnectionsSourceAction,
  EcsDeployAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';

interface ImageRepoDeploymentProps extends StackProps {
  ecrRepo: IRepository;
  ecsService: IBaseService;
  githubSourceConfig: {
    owner: string;
    repo: string;
    branch: string;
    codestarConnectionArn: string;
  };
  env: {
    region: string;
  };
}

export class ImageRepoDeployment extends Construct {
  constructor(scope: Construct, id: string, props: ImageRepoDeploymentProps) {
    super(scope, id);

    const {
      env: { region },
    } = props;

    const { ecrRepo, ecsService, githubSourceConfig } = props;

    // CodeBuild project to build and push Docker image
    const buildProject = new PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        privileged: true, // Needed for Docker builds
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: { 'runtime-versions': { nodejs: '22' } },
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${ecrRepo.repositoryUri}`,
            ],
          },
          build: {
            commands: [
              'echo Building Docker image...',
              `docker build -t ${ecrRepo.repositoryUri}:latest .`,
              `docker push ${ecrRepo.repositoryUri}:latest`,
              'echo Writing imagedefinitions.json...',
              `echo '[{"name":"ExpressContainer","imageUri":"${ecrRepo.repositoryUri}:latest"}]' > imagedefinitions.json`,
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'], // ✅ Ensure this artifact is passed to ECS Deploy
        },
      }),
    });

    // Grant permissions to push images to ECR
    ecrRepo.grantPullPush(buildProject.role!);

    // CodePipeline definition
    const pipeline = new Pipeline(this, 'Pipeline');

    // Source Stage (Fetch from GitHub)
    const sourceOutput = new Artifact();
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new CodeStarConnectionsSourceAction({
          actionName: 'GitHubSource',
          owner: githubSourceConfig.owner,
          repo: githubSourceConfig.repo,
          branch: githubSourceConfig.branch,
          connectionArn: githubSourceConfig.codestarConnectionArn,
          triggerOnPush: true,
          output: sourceOutput,
        }),
      ],
    });

    // Build Stage (Build & Push Docker Image)
    const buildOutput = new Artifact('BuildOutput');
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'BuildAndPushImage',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Deploy Stage (Update ECS EC2 Service)
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new EcsDeployAction({
          actionName: 'DeployToECS',
          service: ecsService,
          input: buildOutput,
        }),
      ],
    });
  }
}
