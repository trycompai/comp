import * as aws from '@pulumi/aws';
import { CommonConfig } from '../types';

export function createAppSecrets(config: CommonConfig) {
  const { commonTags } = config;

  // Create AWS Secret for application credentials
  const appSecret = new aws.secretsmanager.Secret(`${config.projectName}-app-secret`, {
    namePrefix: `${config.projectName}/application/secrets-`,
    description: 'Application secrets for AUTH_SECRET, RESEND_API_KEY, etc.',
    tags: {
      ...commonTags,
      Name: `${config.projectName}-app-secret`,
      Type: 'secret',
      Purpose: 'application-secrets',
    },
  });

  // Store application secrets with placeholder values
  const appSecretVersion = new aws.secretsmanager.SecretVersion(
    `${config.projectName}-app-secret-version`,
    {
      secretId: appSecret.id,
      secretString: JSON.stringify({
        AUTH_SECRET: 'PLACEHOLDER_SET_IN_AWS_CONSOLE',
        RESEND_API_KEY: 'PLACEHOLDER_SET_IN_AWS_CONSOLE',
        REVALIDATION_SECRET: 'PLACEHOLDER_SET_IN_AWS_CONSOLE',
      }),
    },
  );

  return {
    secretArn: appSecret.arn,
    secretId: appSecret.id,
  };
}
