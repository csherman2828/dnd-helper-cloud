#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CampaignManagerStage } from '../lib/CampaignManagerStage';

const app = new cdk.App();
new CampaignManagerStage(app, 'CampaignManager', {
  env: { account: '056680897227', region: 'us-east-1' },
});
