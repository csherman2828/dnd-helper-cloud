import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { WebAppDeploymentStack } from './web-app-deployment/WebAppDeploymentStack';
import { AuthenticationStack } from './authentication/AuthenticationStack';

export class CampaignManagerStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new AuthenticationStack(this, 'Authentication');
    new WebAppDeploymentStack(this, 'WebAppDeployment');
  }
}
