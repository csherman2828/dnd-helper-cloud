import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { WebStack } from './web/WebStack';
import { AuthenticationStack } from './auth/AuthenticationStack';

export class DndHelperStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AuthenticationStack(this, 'Authentication');
    new WebStack(this, 'Web', {
      hostedZoneDomainName: 'shermaniac.com',
      domainName: 'dnd.shermaniac.com',
      repoConfig: {
        owner: 'csherman2828',
        name: 'dnd-helper-web',
        branch: 'main',
        codeConnectionArn:
          'arn:aws:codeconnections:us-east-1:056680897227:connection/1e7e31d8-cb45-4cac-9d2d-aa59055e88bf',
      },
    });
  }
}
