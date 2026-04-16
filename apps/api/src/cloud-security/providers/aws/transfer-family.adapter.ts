import {
  DescribeServerCommand,
  ListServersCommand,
  TransferClient,
} from '@aws-sdk/client-transfer';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class TransferFamilyAdapter implements AwsServiceAdapter {
  readonly serviceId = 'transfer-family';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new TransferClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListServersCommand({ NextToken: nextToken }),
        );

        for (const server of listRes.Servers ?? []) {
          const serverId = server.ServerId;
          if (!serverId) continue;

          const descRes = await client.send(
            new DescribeServerCommand({ ServerId: serverId }),
          );

          const desc = descRes.Server;
          if (!desc) continue;

          const serverArn = desc.Arn ?? serverId;
          const protocols = desc.Protocols ?? [];

          if (protocols.includes('FTP')) {
            findings.push(
              this.makeFinding(
                serverArn,
                'FTP protocol enabled (unencrypted)',
                `Transfer server "${serverId}" has FTP enabled which transmits data unencrypted — use SFTP or FTPS instead`,
                'high',
                { serverId, protocols, service: 'Transfer Family' },
                false,
                `Use transfer:UpdateServerCommand with ServerId set to '${serverId}' and Protocols set to ['SFTP'] (or ['SFTP', 'FTPS'] if FTPS is also needed). Remove 'FTP' from the Protocols array. Rollback: use transfer:UpdateServerCommand to add 'FTP' back to Protocols. [MANUAL] Ensure all clients are updated to use SFTP/FTPS before removing FTP.`,
              ),
            );
          }

          const logDestinations = desc.StructuredLogDestinations ?? [];

          if (logDestinations.length === 0) {
            findings.push(
              this.makeFinding(
                serverArn,
                'Structured logging not configured',
                `Transfer server "${serverId}" does not have structured logging configured`,
                'medium',
                { serverId, service: 'Transfer Family' },
                false,
                `Use transfer:UpdateServerCommand with ServerId set to '${serverId}' and StructuredLogDestinations set to a CloudWatch Logs log group ARN (e.g., ['arn:aws:logs:region:account:log-group:/aws/transfer/${serverId}']). Ensure the server's IAM role has logs:CreateLogGroup, logs:CreateLogStream, and logs:PutLogEvents permissions. Rollback: use transfer:UpdateServerCommand with StructuredLogDestinations set to an empty array.`,
              ),
            );
          }

          if (desc.EndpointType === 'PUBLIC') {
            findings.push(
              this.makeFinding(
                serverArn,
                'Server has public endpoint',
                `Transfer server "${serverId}" uses a public endpoint — consider using VPC or VPC_ENDPOINT type`,
                'medium',
                {
                  serverId,
                  endpointType: desc.EndpointType,
                  service: 'Transfer Family',
                },
                false,
                `Use transfer:UpdateServerCommand with ServerId set to '${serverId}' and EndpointType set to 'VPC', along with EndpointDetails containing VpcId, SubnetIds, and SecurityGroupIds. [MANUAL] Changing endpoint type causes server downtime and DNS changes. Ensure clients are updated with the new endpoint. Rollback: use transfer:UpdateServerCommand with EndpointType set to 'PUBLIC'.`,
              ),
            );
          }

          const hasNoIssues =
            !protocols.includes('FTP') &&
            logDestinations.length > 0 &&
            desc.EndpointType !== 'PUBLIC';

          if (hasNoIssues) {
            findings.push(
              this.makeFinding(
                serverArn,
                'Transfer server is well configured',
                `Transfer server "${serverId}" uses secure protocols, has logging, and a non-public endpoint`,
                'info',
                { serverId, protocols, service: 'Transfer Family' },
                true,
              ),
            );
          }
        }

        nextToken = listRes.NextToken;
      } while (nextToken);
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
    const id = `transfer-family-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsTransferServer',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}
