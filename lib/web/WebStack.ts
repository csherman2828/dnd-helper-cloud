import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

import HTTPSBucketDistribution from './HTTPSBucketDistribution';
import FrontendRepoPipeline from './FrontendRepoPipeline';

interface WebStackProps extends StackProps {
  hostedZoneDomainName: string;
  domainName: string;
  repoConfig: {
    owner: string;
    name: string;
    branch: string;
    codeConnectionArn: string;
  };
}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { hostedZoneDomainName, domainName, repoConfig } = props;

    const webAppBucket = new Bucket(this, 'WebAppBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    new HTTPSBucketDistribution(this, 'WebAppDistribution', {
      bucket: webAppBucket,
      domainName,
      hostedZoneDomainName,
    });

    new FrontendRepoPipeline(this, 'WebAppPipeline', {
      bucket: webAppBucket,
      repoConfig,
    });
  }
}
