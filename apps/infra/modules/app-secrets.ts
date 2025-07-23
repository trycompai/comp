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

  // Store application secrets from environment variables, deduplicating as needed
  const appSecretVersion = new aws.secretsmanager.SecretVersion(
    `${config.projectName}-app-secret-version`,
    {
      secretId: appSecret.id,
      // TODO: Populate secrets in AWS secrets manager UI.
      secretString: JSON.stringify({
        // Required
        AUTH_SECRET: 'PLACEHOLDER',
        RESEND_API_KEY: 'PLACEHOLDER', // For sending emails, and magic link sign in.
        REVALIDATION_SECRET: 'PLACEHOLDER',
        SECRET_KEY: 'PLACEHOLDER', // For encrypting api keys
        UPSTASH_REDIS_REST_URL: 'PLACEHOLDER',
        UPSTASH_REDIS_REST_TOKEN: 'PLACEHOLDER',
        OPENAI_API_KEY: 'PLACEHOLDER', // Used for populating policies with AI
        TRIGGER_SECRET_KEY: 'PLACEHOLDER',

        // Optional - comment out if not used.
        AUTH_GOOGLE_ID: 'PLACEHOLDER',
        AUTH_GOOGLE_SECRET: 'PLACEHOLDER',
        AUTH_GITHUB_ID: 'PLACEHOLDER',
        AUTH_GITHUB_SECRET: 'PLACEHOLDER',
        AWS_BUCKET_NAME: 'PLACEHOLDER',
        AWS_REGION: 'PLACEHOLDER',
        AWS_ACCESS_KEY_ID: 'PLACEHOLDER',
        AWS_SECRET_ACCESS_KEY: 'PLACEHOLDER',
        DISCORD_WEBHOOK_URL: 'PLACEHOLDER',
        SLACK_SALES_WEBHOOK: 'PLACEHOLDER',
        HUBSPOT_ACCESS_TOKEN: 'PLACEHOLDER',
        IS_VERCEL: 'PLACEHOLDER',
      }),
    },
  );

  return {
    secretArn: appSecret.arn,
    secretId: appSecret.id,
  };
}
