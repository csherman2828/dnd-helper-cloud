#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DndHelperStage } from '../lib/DndHelperStage';

const app = new cdk.App();
new DndHelperStage(app, 'DndHelper', {
  hostedZoneDomain: 'shermaniac.com',
  subdomain: 'dnd',
  github: {
    owner: 'csherman2828',
    webRepo: 'dnd-helper-web',
    apiRepo: 'dnd-helper-api',
    branch: 'main',
    codestarConnectionArn:
      'arn:aws:codeconnections:us-east-1:056680897227:connection/1e7e31d8-cb45-4cac-9d2d-aa59055e88bf',
  },
  env: { account: '056680897227', region: 'us-east-1' },
});
