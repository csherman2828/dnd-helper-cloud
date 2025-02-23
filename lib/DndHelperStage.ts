import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { WebStack } from './web/WebStack';
import { AuthenticationStack } from './auth/AuthenticationStack';
import { ApiStack } from './api/ApiStack';
import { ApiPlatformStack } from './api/ApiPlatformStack';

const CODESTAR_CONNECTION_ARN =
  'arn:aws:codeconnections:us-east-1:056680897227:connection/1e7e31d8-cb45-4cac-9d2d-aa59055e88bf';
const GITHUB_OWNER = 'csherman2828';

export class DndHelperStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AuthenticationStack(this, 'Authentication');
    new WebStack(this, 'Web', {
      hostedZoneDomainName: 'shermaniac.com',
      domainName: 'dnd.shermaniac.com',
      githubSourceConfig: {
        owner: GITHUB_OWNER,
        repo: 'dnd-helper-web',
        branch: 'main',
        codestarConnectionArn: CODESTAR_CONNECTION_ARN,
      },
    });

    const apiPlatformStack = new ApiPlatformStack(this, 'ApiPlatform');

    const { ecrRepo } = apiPlatformStack;

    const apiStack = new ApiStack(this, 'Api', {
      githubSourceConfig: {
        owner: GITHUB_OWNER,
        repo: 'dnd-helper-api',
        branch: 'main',
        codestarConnectionArn: CODESTAR_CONNECTION_ARN,
      },
      ecrRepo,
      ...props,
    });
    apiStack.addDependency(apiPlatformStack);
  }
}
