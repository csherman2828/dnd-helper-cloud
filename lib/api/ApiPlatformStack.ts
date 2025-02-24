import { Stack } from 'aws-cdk-lib';
import { Repository, IRepository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class ApiPlatformStack extends Stack {
  public readonly ecrRepo: IRepository;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // const { github } = props;

    // Create an ECR repository
    this.ecrRepo = new Repository(this, 'ImageRepository');
  }
}
