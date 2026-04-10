import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { getManifest } from '@trycompai/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionService } from './connection.service';
import {
  withCheckDisabled,
  withCheckEnabled,
} from '../utils/disabled-task-checks';

/**
 * Handles enable/disable of a single integration check for a single task.
 *
 * This does NOT disconnect the whole integration — only removes one check from
 * one task. The disable state lives on the connection's metadata so it
 * survives alongside credentials and is scoped to the specific connection that
 * provides the check.
 */
@Injectable()
export class TaskIntegrationChecksService {
  private readonly logger = new Logger(TaskIntegrationChecksService.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly connectionService: ConnectionService,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /**
   * Disconnect a single check from a single task. The connection stays active
   * for all other tasks that use it. Validates that:
   *   - the task exists and belongs to the org
   *   - the connection exists and belongs to the org
   *   - the provider has a check with this id
   */
  async disconnectCheckFromTask(params: {
    taskId: string;
    connectionId: string;
    checkId: string;
    organizationId: string;
  }): Promise<{ disabled: true }> {
    const { taskId, connectionId, checkId, organizationId } = params;

    const connection = await this.loadConnectionForOrg(
      connectionId,
      organizationId,
    );
    await this.assertTaskInOrg(taskId, organizationId);
    await this.assertCheckExists(connection.providerId, checkId);

    const nextMetadata = withCheckDisabled(
      connection.metadata,
      taskId,
      checkId,
    );
    await this.connectionService.updateConnectionMetadata(
      connectionId,
      nextMetadata,
    );

    this.logger.log(
      `Disabled check ${checkId} for task ${taskId} on connection ${connectionId}`,
    );
    return { disabled: true };
  }

  /**
   * Re-enable a single check for a single task. Inverse of disconnect.
   */
  async reconnectCheckToTask(params: {
    taskId: string;
    connectionId: string;
    checkId: string;
    organizationId: string;
  }): Promise<{ disabled: false }> {
    const { taskId, connectionId, checkId, organizationId } = params;

    const connection = await this.loadConnectionForOrg(
      connectionId,
      organizationId,
    );
    await this.assertTaskInOrg(taskId, organizationId);
    await this.assertCheckExists(connection.providerId, checkId);

    const nextMetadata = withCheckEnabled(connection.metadata, taskId, checkId);
    await this.connectionService.updateConnectionMetadata(
      connectionId,
      nextMetadata,
    );

    this.logger.log(
      `Re-enabled check ${checkId} for task ${taskId} on connection ${connectionId}`,
    );
    return { disabled: false };
  }

  private async loadConnectionForOrg(
    connectionId: string,
    organizationId: string,
  ) {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new NotFoundException('Connection not found');
    }
    return connection;
  }

  private async assertTaskInOrg(taskId: string, organizationId: string) {
    const task = await db.task.findUnique({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async assertCheckExists(providerId: string, checkId: string) {
    const provider = await this.providerRepository.findById(providerId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new NotFoundException('Manifest not found');
    }
    const check = manifest.checks?.find((c) => c.id === checkId);
    if (!check) {
      throw new BadRequestException(
        `Check "${checkId}" is not defined for provider "${provider.slug}"`,
      );
    }
  }
}
