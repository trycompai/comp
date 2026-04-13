import {
  DescribeConfigurationSettingsCommand,
  DescribeEnvironmentsCommand,
  ElasticBeanstalkClient,
} from '@aws-sdk/client-elastic-beanstalk';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ElasticBeanstalkAdapter implements AwsServiceAdapter {
  readonly serviceId = 'elastic-beanstalk';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ElasticBeanstalkClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const envRes = await client.send(
        new DescribeEnvironmentsCommand({ IncludeDeleted: false }),
      );

      for (const env of envRes.Environments ?? []) {
        const envName = env.EnvironmentName ?? 'unknown';
        const envId = env.EnvironmentId ?? envName;
        const envArn = env.EnvironmentArn ?? envId;

        if (env.HealthStatus && env.HealthStatus !== 'Ok') {
          findings.push(
            this.makeFinding(
              envArn,
              'Environment health status is not Ok',
              `Environment "${envName}" has health status "${env.HealthStatus}"`,
              'low',
              {
                environmentName: envName,
                healthStatus: env.HealthStatus,
                service: 'Elastic Beanstalk',
              },
              false,
              `[MANUAL] Cannot be auto-fixed. Investigate the environment health by reviewing recent events and logs. Use elasticbeanstalk:DescribeEventsCommand with EnvironmentName set to '${envName}' to check for errors. Common causes include failed deployments, instance health issues, or resource limits.`,
            ),
          );
        }

        const appName = env.ApplicationName;
        if (!appName) continue;

        const configRes = await client.send(
          new DescribeConfigurationSettingsCommand({
            ApplicationName: appName,
            EnvironmentName: envName,
          }),
        );

        const settings =
          configRes.ConfigurationSettings?.[0]?.OptionSettings ?? [];

        const managedActionsOpt = settings.find(
          (s) =>
            s.Namespace === 'aws:elasticbeanstalk:managedactions' &&
            s.OptionName === 'ManagedActionsEnabled',
        );

        if (managedActionsOpt?.Value !== 'true') {
          findings.push(
            this.makeFinding(
              envArn,
              'Managed platform updates not enabled',
              `Environment "${envName}" does not have managed platform updates enabled — updates must be applied manually`,
              'medium',
              {
                environmentName: envName,
                managedActionsEnabled: managedActionsOpt?.Value ?? 'not set',
                service: 'Elastic Beanstalk',
              },
              false,
              `Use elasticbeanstalk:UpdateEnvironmentCommand with EnvironmentName set to '${envName}' and OptionSettings containing Namespace 'aws:elasticbeanstalk:managedactions', OptionName 'ManagedActionsEnabled', Value 'true'. Also set 'aws:elasticbeanstalk:managedactions:platformupdate' with UpdateLevel 'minor' and PreferredStartTime. Rollback: use elasticbeanstalk:UpdateEnvironmentCommand with ManagedActionsEnabled set to 'false'.`,
            ),
          );
        }

        const healthReportingOpt = settings.find(
          (s) =>
            s.Namespace ===
              'aws:elasticbeanstalk:healthreporting:system' &&
            s.OptionName === 'SystemType',
        );

        if (healthReportingOpt?.Value !== 'enhanced') {
          findings.push(
            this.makeFinding(
              envArn,
              'Enhanced health reporting not enabled',
              `Environment "${envName}" does not use enhanced health reporting — basic reporting provides limited visibility`,
              'medium',
              {
                environmentName: envName,
                systemType: healthReportingOpt?.Value ?? 'not set',
                service: 'Elastic Beanstalk',
              },
              false,
              `Use elasticbeanstalk:UpdateEnvironmentCommand with EnvironmentName set to '${envName}' and OptionSettings containing Namespace 'aws:elasticbeanstalk:healthreporting:system', OptionName 'SystemType', Value 'enhanced'. Rollback: use elasticbeanstalk:UpdateEnvironmentCommand with SystemType set to 'basic'.`,
            ),
          );
        }

        const isHealthy =
          (!env.HealthStatus || env.HealthStatus === 'Ok') &&
          managedActionsOpt?.Value === 'true' &&
          healthReportingOpt?.Value === 'enhanced';

        if (isHealthy) {
          findings.push(
            this.makeFinding(
              envArn,
              'Environment is well configured',
              `Environment "${envName}" has managed updates and enhanced health reporting enabled`,
              'info',
              { environmentName: envName, service: 'Elastic Beanstalk' },
              true,
            ),
          );
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    resourceId: string,
    title: string,
    description: string,
    severity: SecurityFinding['severity'],
    evidence?: Record<string, unknown>,
    passed?: boolean,
    remediation?: string,
  ): SecurityFinding {
    const id = `elastic-beanstalk-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsElasticBeanstalkEnvironment',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}
