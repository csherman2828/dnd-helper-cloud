import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

import HTTPSBucketDomain from './HTTPSBucketDomain';
import FrontendRepoPipeline from './FrontendRepoDeployment';

interface WebStackProps extends StackProps {
  hostedZoneDomain: string;
  domainName: string;
  github: {
    owner: string;
    repo: string;
    branch: string;
    codestarConnectionArn: string;
  };
}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { hostedZoneDomain, domainName, github } = props;

    const webAppBucket = new Bucket(this, 'Site', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    new HTTPSBucketDomain(this, 'Domain', {
      bucket: webAppBucket,
      domainName,
      hostedZoneDomain,
    });

    new FrontendRepoPipeline(this, 'Deployment', {
      bucket: webAppBucket,
      github,
    });
  }
}
