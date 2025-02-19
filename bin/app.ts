#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DndHelperStage } from '../lib/DndHelperStage';

const app = new cdk.App();
new DndHelperStage(app, 'DndHelper', {
  env: { account: '056680897227', region: 'us-east-1' },
});
