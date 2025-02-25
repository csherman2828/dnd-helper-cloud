import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Repository, IRepository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class ApiPlatformStack extends Stack {
  public readonly ecrRepo: IRepository;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.ecrRepo = new Repository(this, 'ImageRepository');

    new CfnOutput(this, 'ECRRepoUri', {
      value: this.ecrRepo.repositoryUri,
      description: 'The URI of the ECR repository',
      exportName: 'ECRRepoUri',
    });

    new CfnOutput(this, 'ECRRepoName', {
      value: this.ecrRepo.repositoryName,
      description: 'The name of the ECR repository',
      exportName: 'ECRRepoName',
    });
  }
}
