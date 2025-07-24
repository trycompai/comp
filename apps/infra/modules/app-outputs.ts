import * as pulumi from '@pulumi/pulumi';
import { ApplicationOutput } from '../types';

export interface AppDeployment {
  app: {
    name: string;
  };
  buildProject: {
    name: pulumi.Output<string>;
  };
  container: {
    serviceName: pulumi.Output<string>;
    repositoryUrl: pulumi.Output<string>;
    logGroupName: pulumi.Output<string>;
  };
  loadBalancer?: {
    applicationUrl: pulumi.Output<string>;
    healthCheckUrl: pulumi.Output<string>;
  };
}

export interface AppSecrets {
  [appName: string]: {
    [secretName: string]: {
      name: pulumi.Output<string>;
    };
  };
}

export function createApplicationOutputs(
  deployments: AppDeployment[],
  appSecrets: AppSecrets,
): Record<string, ApplicationOutput> {
  return deployments.reduce(
    (acc, deployment) => {
      const appName = deployment.app.name;

      // Each app now has its own load balancer, so use that directly
      const appUrl = deployment.loadBalancer?.applicationUrl || pulumi.output('');

      // Handle secrets mapping safely
      const appSecretsForApp = appSecrets[deployment.app.name];
      const secrets = appSecretsForApp
        ? Object.entries(appSecretsForApp).reduce(
            (acc, [secretName, secret]) => {
              acc[secretName] = secret.name;
              return acc;
            },
            {} as Record<string, pulumi.Output<string>>,
          )
        : undefined;

      acc[appName] = {
        url: appUrl,
        serviceName: deployment.container.serviceName,
        ecrRepository: deployment.container.repositoryUrl,
        logGroup: deployment.container.logGroupName,
        buildProject: deployment.buildProject.name,
        healthCheckUrl: deployment.loadBalancer?.healthCheckUrl || pulumi.output(''),
        secrets,
        deployCommand: pulumi.interpolate`aws codebuild start-build --project-name ${deployment.buildProject.name}`,
      };

      return acc;
    },
    {} as Record<string, ApplicationOutput>,
  );
}
