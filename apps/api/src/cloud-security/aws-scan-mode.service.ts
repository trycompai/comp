import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import {
  type AwsScanMode,
  resolveAwsScanMode,
} from './aws-scan-mode';
import { logCloudSecurityActivity } from './cloud-security-audit';

/**
 * Manages the AWS scan-engine choice on a connection. Lives separately
 * from CloudSecurityService so the scan-mode concern has one obvious
 * home — engineers grep for `aws-scan-mode.service` and find every
 * read / write site at once.
 */
@Injectable()
export class CloudAwsScanModeService {
  private readonly logger = new Logger(CloudAwsScanModeService.name);

  /**
   * Update the scan engine on an AWS connection. Validates:
   *   - The connection exists and belongs to the caller's org.
   *   - The connection is an AWS provider (other providers don't have
   *     a scan-mode concept).
   *
   * Idempotent — re-applying the same mode is a successful no-op.
   *
   * Writes an audit-log entry so a mode change is traceable later.
   * Reconciliation reads `IntegrationCheckRun.scanMode` per run, so
   * after this update the next scan automatically uses the new engine
   * and reconciliation only diffs same-mode runs (see
   * `reconciliation.service.ts`).
   */
  async updateMode(params: {
    connectionId: string;
    organizationId: string;
    userId: string;
    mode: AwsScanMode;
  }): Promise<{ mode: AwsScanMode }> {
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: params.connectionId,
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        metadata: true,
        provider: { select: { slug: true } },
      },
    });

    if (!connection) {
      throw new ForbiddenException(
        'Connection not found or does not belong to your organization.',
      );
    }
    if (connection.provider?.slug !== 'aws') {
      throw new BadRequestException(
        'Scan engine choice is only available for AWS connections.',
      );
    }

    const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
    const previousMode = resolveAwsScanMode(metadata.awsScanMode);

    if (previousMode === params.mode) {
      // Idempotent no-op — return the current mode without writing.
      return { mode: params.mode };
    }

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      awsScanMode: params.mode,
    };

    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        metadata: nextMetadata as unknown as Prisma.InputJsonValue,
      },
    });

    await logCloudSecurityActivity({
      organizationId: params.organizationId,
      userId: params.userId,
      connectionId: connection.id,
      action: 'scan_mode_changed',
      description: `Switched AWS scan engine: ${previousMode} → ${params.mode}`,
      metadata: {
        previousMode,
        newMode: params.mode,
      },
    });

    this.logger.log(
      `Connection ${connection.id} scan mode: ${previousMode} → ${params.mode}`,
    );
    return { mode: params.mode };
  }
}
