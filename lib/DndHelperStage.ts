import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { WebStack } from './web/WebStack';
import { AuthenticationStack } from './auth/AuthenticationStack';
import { DataStack } from './data/DataStack';
import { ApiStack } from './api/ApiStack';
import { ApiPlatformStack } from './api/ApiPlatformStack';

interface DndHelperStageProps extends StageProps {
  hostedZoneDomain: string;
  subdomain: string;
  github: {
    owner: string;
    webRepo: string;
    apiRepo: string;
    branch: string;
    codestarConnectionArn: string;
  };
  env: {
    account: string;
    region: string;
  };
}

export class DndHelperStage extends Stage {
  constructor(scope: Construct, id: string, props: DndHelperStageProps) {
    super(scope, id, props);

    const { hostedZoneDomain, subdomain, github, env } = props;

    const { region } = env;

    const dataStack = new DataStack(this, 'Data');

    const { table } = dataStack;

    const authStack = new AuthenticationStack(this, 'Authentication');
    new WebStack(this, 'Web', {
      hostedZoneDomain,
      subdomain: subdomain,
      github: {
        owner: github.owner,
        repo: github.webRepo,
        branch: github.branch,
        codestarConnectionArn: github.codestarConnectionArn,
      },
    });
    const { userPool } = authStack;

    const apiPlatformStack = new ApiPlatformStack(this, 'ApiPlatform');

    const { ecrRepo } = apiPlatformStack;

    const apiStack = new ApiStack(this, 'Api', {
      hostedZoneDomain,
      subdomain: `api.${subdomain}`,
      github: {
        owner: github.owner,
        repo: github.apiRepo,
        branch: github.branch,
        codestarConnectionArn: github.codestarConnectionArn,
      },
      ecrRepo,
      region,
      table,
      userPool,
    });
    apiStack.addDependency(apiPlatformStack);
    apiStack.addDependency(authStack);
    apiStack.addDependency(dataStack);
  }
}
