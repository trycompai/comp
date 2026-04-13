import {
  DescribeEventBusCommand,
  EventBridgeClient,
  ListEventBusesCommand,
} from '@aws-sdk/client-eventbridge';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class EventBridgeAdapter implements AwsServiceAdapter {
  readonly serviceId = 'eventbridge';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new EventBridgeClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const listRes = await client.send(new ListEventBusesCommand({}));
      const buses = listRes.EventBuses ?? [];

      const customBuses = buses.filter((b) => b.Name !== 'default');

      if (customBuses.length === 0) {
        findings.push(
          this.makeFinding(
            `arn:aws:events:${region}:default-only`,
            'Only default event bus exists',
            'No custom event buses found — only the default bus is present',
            'info',
            { region },
            true,
          ),
        );
      }

      for (const bus of buses) {
        const busName = bus.Name ?? 'unknown';
        const busArn = bus.Arn ?? `arn:aws:events:${region}:${busName}`;

        const descRes = await client.send(
          new DescribeEventBusCommand({ Name: busName }),
        );

        const policyStr = descRes.Policy;
        if (!policyStr) continue;

        let policy: Record<string, unknown>;
        try {
          policy = JSON.parse(policyStr) as Record<string, unknown>;
        } catch {
          continue;
        }

        const statements = Array.isArray(policy.Statement)
          ? (policy.Statement as Record<string, unknown>[])
          : [];

        for (const stmt of statements) {
          if (stmt.Effect !== 'Allow') continue;

          const principal = stmt.Principal;
          const hasCondition =
            stmt.Condition != null &&
            typeof stmt.Condition === 'object' &&
            Object.keys(stmt.Condition as object).length > 0;

          const isPublic =
            principal === '*' ||
            (typeof principal === 'object' &&
              principal !== null &&
              (principal as Record<string, unknown>).AWS === '*');

          if (isPublic && !hasCondition) {
            findings.push(
              this.makeFinding(
                busArn,
                'Event bus has public access policy',
                `Event bus "${busName}" has a resource policy granting public access without restrictive conditions`,
                'high',
                { busName, service: 'EventBridge' },
                false,
                `Use events:PutPermissionCommand with EventBusName set to '${busName}' and Policy set to a JSON policy string with restricted Principal (specific AWS account IDs instead of '*') and Condition keys (e.g., aws:PrincipalOrgID). Alternatively, use events:RemovePermissionCommand with EventBusName and StatementId to remove the public statement. Rollback: use events:PutPermissionCommand to restore the original policy.`,
              ),
            );
            break;
          }
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
    const id = `eventbridge-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsEventBridgeBus',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}
