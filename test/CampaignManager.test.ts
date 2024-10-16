import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CampaignManagerStack } from '../lib/CampaignManager';

it('synths with user pool', () => {
  const app = new cdk.App();
  const stack = new CampaignManagerStack(app, 'MyTestStack');
  Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {
    DeletionPolicy: 'Retain',
  });
});
