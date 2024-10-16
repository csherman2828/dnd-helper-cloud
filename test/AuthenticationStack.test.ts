import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AuthenticationStack } from '../lib/authentication/AuthenticationStack';

it('synths with user pool', () => {
  const app = new cdk.App();
  const stack = new AuthenticationStack(app, 'MyTestStack');
  Template.fromStack(stack).hasResource('AWS::Cognito::UserPool', {
    DeletionPolicy: 'Retain',
  });
});
