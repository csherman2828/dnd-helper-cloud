import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  UserPool,
  Mfa,
  AccountRecovery,
  StringAttribute,
  UserPoolEmail,
} from 'aws-cdk-lib/aws-cognito';

export class CampaignManagerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'CampaignManagerAuthentication', {
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
      signInAliases: {
        email: true,
        username: false,
        preferredUsername: false,
        phone: false,
      },
      signInCaseSensitive: false,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
        phone: false,
      },
      keepOriginal: {
        email: false,
        phone: false,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        'custom:display_name': new StringAttribute({ mutable: true }),
      },
      email: UserPoolEmail.withCognito(),
      enableSmsRole: true,
      deviceTracking: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: false,
      },
    });

    userPool.addClient('WebAppClient', {
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userPassword: true,
        userSrp: true,
      },
      authSessionValidity: Duration.minutes(3),
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
    });
  }
}
