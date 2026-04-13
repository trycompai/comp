import {
  SecretsManagerClient,
  ListSecretsCommand,
} from '@aws-sdk/client-secrets-manager';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export class SecretsManagerAdapter implements AwsServiceAdapter {
  readonly serviceId = 'secrets-manager';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new SecretsManagerClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const response = await client.send(
          new ListSecretsCommand({ NextToken: nextToken }),
        );

        for (const secret of response.SecretList ?? []) {
          const secretName = secret.Name ?? 'unknown';
          const secretArn =
            secret.ARN ??
            `arn:aws:secretsmanager:${region}:secret/${secretName}`;

          if (secret.RotationEnabled !== true) {
            findings.push(
              this.makeFinding({
                id: `secrets-no-rotation-${secretName}`,
                title: `Secret ${secretName} does not have rotation enabled`,
                description: `Secret ${secretName} does not have automatic rotation configured.`,
                severity: 'medium',
                resourceId: secretArn,
                remediation:
                  '[MANUAL] Cannot be auto-fixed. Enabling secret rotation requires creating a Lambda rotation function specific to the secret type (database credentials, API keys, etc.). Configure rotation via secretsmanager:RotateSecretCommand after setting up the Lambda function.',
              }),
            );
            continue;
          }

          if (secret.LastRotatedDate) {
            const age = Date.now() - secret.LastRotatedDate.getTime();

            if (age > NINETY_DAYS_MS) {
              const daysSince = Math.floor(age / (24 * 60 * 60 * 1000));
              findings.push(
                this.makeFinding({
                  id: `secrets-rotation-overdue-${secretName}`,
                  title: `Secret ${secretName} rotation overdue`,
                  description: `Secret ${secretName} was last rotated ${daysSince} days ago, exceeding the 90-day threshold.`,
                  severity: 'medium',
                  resourceId: secretArn,
                  remediation:
                    'Trigger an immediate rotation and verify the rotation schedule.',
                  evidence: {
                    lastRotated: secret.LastRotatedDate.toISOString(),
                    daysSinceRotation: daysSince,
                  },
                }),
              );
              continue;
            }
          }

          findings.push(
            this.makeFinding({
              id: `secrets-rotation-ok-${secretName}`,
              title: `Secret ${secretName} rotation is configured`,
              description: `Secret ${secretName} has rotation enabled and is within the 90-day rotation window.`,
              severity: 'info',
              resourceId: secretArn,
              passed: true,
            }),
          );
        }

        nextToken = response.NextToken;
      } while (nextToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    params: Omit<SecurityFinding, 'resourceType' | 'createdAt'> & {
      remediation?: string;
    },
  ): SecurityFinding {
    return {
      ...params,
      evidence: { ...params.evidence, findingKey: params.id },
      resourceType: 'AwsSecretsManagerSecret',
      createdAt: new Date().toISOString(),
    };
  }
}
