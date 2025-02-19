import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

import HTTPSBucketDomain from './HTTPSBucketDomain';
import FrontendRepoPipeline from './FrontendRepoDeployment';

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

    const webAppBucket = new Bucket(this, 'Site', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    new HTTPSBucketDomain(this, 'Domain', {
      bucket: webAppBucket,
      domainName,
      hostedZoneDomainName,
    });

    new FrontendRepoPipeline(this, 'Deployment', {
      bucket: webAppBucket,
      repoConfig,
    });
  }
}
