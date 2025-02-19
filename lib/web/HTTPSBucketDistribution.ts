import { Construct } from 'constructs';

import {
  Certificate,
  CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import {
  Distribution,
  HttpVersion,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';

interface HTTPSBucketDistributionProps {
  bucket: IBucket;
  domainName: string;
  hostedZoneDomainName: string;
}

class HTTPSBucketDistribution extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: HTTPSBucketDistributionProps,
  ) {
    super(scope, id);

    const { bucket, domainName, hostedZoneDomainName } = props;

    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: hostedZoneDomainName,
    });

    const certificate = new Certificate(this, 'Certificate', {
      domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const distribution = new Distribution(this, 'Distribution', {
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [bucket.arnForObjects('*')],
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': distribution.distributionArn,
          },
        },
      }),
    );

    new ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}

export default HTTPSBucketDistribution;
