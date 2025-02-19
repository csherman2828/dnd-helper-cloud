import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { WebAppDeploymentStack } from './web-app-deployment/WebAppDeploymentStack';
import { AuthenticationStack } from './authentication/AuthenticationStack';
// import { StorageStack } from './storage/StorageStack';

export class CampaignManagerStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AuthenticationStack(this, 'Authentication');
    new WebAppDeploymentStack(this, 'WebAppDeployment', {
      hostedZoneDomainName: 'shermaniac.com',
      domainName: 'dnd.shermaniac.com',
      repo: {
        owner: 'csherman2828',
        name: 'dnd-helper-web',
        branch: 'main',
        codeConnectionArn:
          'arn:aws:codeconnections:us-east-1:056680897227:connection/1e7e31d8-cb45-4cac-9d2d-aa59055e88bf',
      },
    });
    // new StorageStack(this, 'Storage');
  }
}
