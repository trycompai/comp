import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig } from '../types';

export function createAppSecrets(config: CommonConfig, applications: ApplicationConfig[]) {
  const { commonTags } = config;

  // Create a secret for each application that needs secrets
  const appSecrets = applications
    .filter((app) => app.requiredSecrets && app.requiredSecrets.length > 0)
    .map((app) => {
      // Create app-specific secret
      const secret = new aws.secretsmanager.Secret(`${config.projectName}-${app.name}-secret`, {
        namePrefix: `${config.projectName}/${app.name}/secrets-`,
        description: `Application secrets for ${app.name}. Update these values in AWS Secrets Manager.`,
        tags: {
          ...commonTags,
          Name: `${config.projectName}-${app.name}-secret`,
          Type: 'secret',
          Purpose: 'application-secrets',
          App: app.name,
        },
      });

      // Create placeholders for all required secrets
      const placeholders: Record<string, string> = {};
      app.requiredSecrets!.forEach((secretName) => {
        placeholders[secretName] = 'PLACEHOLDER';
      });

      const secretVersion = new aws.secretsmanager.SecretVersion(
        `${config.projectName}-${app.name}-secret-version`,
        {
          secretId: secret.id,
          secretString: JSON.stringify(placeholders),
        },
      );

      return {
        appName: app.name,
        secretArn: secret.arn,
        secretId: secret.id,
      };
    });

  // Return a map of app name to secret info
  return appSecrets.reduce(
    (acc, appSecret) => {
      acc[appSecret.appName] = {
        secretArn: appSecret.secretArn,
        secretId: appSecret.secretId,
      };
      return acc;
    },
    {} as Record<string, { secretArn: pulumi.Output<string>; secretId: pulumi.Output<string> }>,
  );
}
