import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

import HTTPSBucketDomain from './HTTPSBucketDomain';
import FrontendRepoPipeline from './FrontendRepoDeployment';

interface WebStackProps extends StackProps {
  hostedZoneDomain: string;
  subdomain: string;
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

    const { hostedZoneDomain, subdomain, github } = props;

    const domainName = `${subdomain}.${hostedZoneDomain}`;

    const webAppBucket = new Bucket(this, 'Site', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Keep bucket private
    });

    const { cloudfrontUrl } = new HTTPSBucketDomain(this, 'Domain', {
      bucket: webAppBucket,
      domainName,
      hostedZoneDomain,
    });

    new FrontendRepoPipeline(this, 'Deployment', {
      bucket: webAppBucket,
      github,
    });

    new CfnOutput(this, 'CloudfrontUrl', {
      value: cloudfrontUrl,
      description: 'The CloudFront URL of the web application',
      exportName: 'CloudfrontUrl',
    });

    new CfnOutput(this, 'WebUrl', {
      value: `https://${domainName}`,
      description: 'The URL of the web application',
      exportName: 'WebUrl',
    });
  }
}
