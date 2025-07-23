import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig } from '../types';

export function createAppSecrets(config: CommonConfig, applications: ApplicationConfig[]) {
  const { commonTags } = config;

  // Create individual secrets for each application
  const appSecrets = applications
    .filter((app) => app.requiredSecrets && app.requiredSecrets.length > 0)
    .reduce(
      (acc, app) => {
        const secrets: Record<string, { arn: pulumi.Output<string>; name: pulumi.Output<string> }> =
          {};

        // Create individual secret for each required secret
        app.requiredSecrets!.forEach((secretName) => {
          const secret = new aws.secretsmanager.Secret(
            `${config.projectName}-${app.name}-${secretName}`,
            {
              name: `${config.projectName}/${app.name}/${secretName}`,
              description: `${secretName} for ${app.name} application`,
              tags: {
                ...commonTags,
                Name: `${config.projectName}-${app.name}-${secretName}`,
                Type: 'secret',
                App: app.name,
                SecretName: secretName,
              },
            },
          );

          // Create secret version with placeholder value
          new aws.secretsmanager.SecretVersion(
            `${config.projectName}-${app.name}-${secretName}-version`,
            {
              secretId: secret.id,
              secretString: 'PLACEHOLDER',
            },
          );

          secrets[secretName] = {
            arn: secret.arn,
            name: secret.name,
          };
        });

        acc[app.name] = secrets;
        return acc;
      },
      {} as Record<
        string,
        Record<string, { arn: pulumi.Output<string>; name: pulumi.Output<string> }>
      >,
    );

  return appSecrets;
}
