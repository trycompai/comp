import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { getManifest } from '@trycompai/integration-platform';
import { db } from '@db';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionAuthTeardownService } from './connection-auth-teardown.service';
import type { IntegrationConnection, IntegrationConnectionStatus } from '@db';

export interface CreateConnectionInput {
  providerSlug: string;
  organizationId: string;
  authStrategy: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly connectionAuthTeardownService: ConnectionAuthTeardownService,
  ) {}

  async getConnection(connectionId: string): Promise<IntegrationConnection> {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    return connection;
  }

  async getConnectionForOrg(
    connectionId: string,
    organizationId: string,
  ): Promise<IntegrationConnection> {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    return connection;
  }

  async getConnectionByProviderSlug(
    providerSlug: string,
    organizationId: string,
  ): Promise<IntegrationConnection | null> {
    return this.connectionRepository.findBySlugAndOrg(
      providerSlug,
      organizationId,
    );
  }

  async getOrganizationConnections(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return this.connectionRepository.findByOrganization(organizationId);
  }

  async getActiveConnections(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return this.connectionRepository.findActiveByOrganization(organizationId);
  }

  async createConnection(
    input: CreateConnectionInput,
  ): Promise<IntegrationConnection> {
    // Verify provider exists
    const provider = await this.providerRepository.findBySlug(
      input.providerSlug,
    );
    if (!provider) {
      throw new NotFoundException(`Provider ${input.providerSlug} not found`);
    }

    // Check if connection already exists (only block if provider doesn't support multiple connections)
    const manifest = getManifest(input.providerSlug);
    const supportsMultiple = manifest?.supportsMultipleConnections ?? false;

    if (!supportsMultiple) {
      const existing = await this.connectionRepository.findByProviderAndOrg(
        provider.id,
        input.organizationId,
      );
      if (existing) {
        throw new ConflictException(
          `Connection to ${input.providerSlug} already exists for this organization`,
        );
      }
    }

    return this.connectionRepository.create({
      providerId: provider.id,
      organizationId: input.organizationId,
      authStrategy: input.authStrategy,
      metadata: input.metadata,
    });
  }

  async updateConnectionStatus(
    connectionId: string,
    status: IntegrationConnectionStatus,
    errorMessage?: string,
  ): Promise<IntegrationConnection> {
    await this.getConnection(connectionId); // Verify exists
    return this.connectionRepository.updateStatus(
      connectionId,
      status,
      errorMessage,
    );
  }

  async activateConnection(
    connectionId: string,
  ): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'active');
  }

  async pauseConnection(connectionId: string): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'paused');
  }

  async setConnectionError(
    connectionId: string,
    errorMessage: string,
  ): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'error', errorMessage);
  }

  async disconnectConnection(
    connectionId: string,
  ): Promise<IntegrationConnection> {
    await this.connectionAuthTeardownService.teardown({ connectionId });

    const connection = await this.connectionRepository.update(connectionId, {
      status: 'disconnected',
      errorMessage: null,
      activeCredentialVersionId: null,
    });

    // Best-effort task status cleanup. The primary disconnect already
    // succeeded above; a failure here must not surface to the caller.
    try {
      await this.reevaluateFailedTasksAfterDisconnect(connectionId);
    } catch (error) {
      this.logger.error(
        `Failed to re-evaluate task statuses after disconnecting ${connectionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return connection;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.getConnection(connectionId); // Verify exists
    await this.connectionAuthTeardownService.teardown({ connectionId });

    // Soft-delete: preserve findings, remediation history, and activity logs
    // for audit trail and compliance. Only clear credentials and mark as disconnected.
    await this.connectionRepository.update(connectionId, {
      status: 'disconnected',
      activeCredentialVersionId: null,
      errorMessage: null,
    });

    // Best-effort task status cleanup (see disconnectConnection for rationale).
    try {
      await this.reevaluateFailedTasksAfterDisconnect(connectionId);
    } catch (error) {
      this.logger.error(
        `Failed to re-evaluate task statuses after deleting ${connectionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * CS-166: After a connection is disconnected, tasks whose status was set to
   * 'failed' by check runs from that connection can end up stuck — the
   * historical runs remain in the DB but no new runs will clear them.
   *
   * We preserve the check run rows for audit (see deleteConnection doc above)
   * and instead fix the UX by re-deriving each affected task's target status
   * from its remaining, non-disconnected automation state. Only 'failed' tasks
   * are considered; 'done' or 'todo' tasks are left alone.
   */
  private async reevaluateFailedTasksAfterDisconnect(
    connectionId: string,
  ): Promise<void> {
    const runs = await db.integrationCheckRun.findMany({
      where: { connectionId, taskId: { not: null } },
      select: { taskId: true },
      distinct: ['taskId'],
    });

    const taskIds = runs
      .map((r) => r.taskId)
      .filter((id): id is string => id !== null);

    if (taskIds.length === 0) return;

    const tasks = await db.task.findMany({
      where: { id: { in: taskIds }, status: 'failed' },
      select: {
        id: true,
        evidenceAutomations: {
          where: { isEnabled: true },
          select: {
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { evaluationStatus: true },
            },
          },
        },
        integrationCheckRuns: {
          where: { connection: { status: { not: 'disconnected' } } },
          orderBy: { createdAt: 'desc' },
          select: { checkId: true, status: true, createdAt: true },
        },
      },
    });

    for (const task of tasks) {
      const target = this.deriveTargetStatusForTask(task);
      if (target === 'failed') continue;
      await db.task.update({
        where: { id: task.id },
        data: { status: target },
      });
      this.logger.log(
        `Task ${task.id} re-evaluated to '${target}' after connection ${connectionId} disconnect`,
      );
    }
  }

  /**
   * Mirror of the scheduler's getTargetStatus (see apps/app/src/trigger/tasks/
   * task/task-schedule-helpers.ts), scoped to the fields we fetch above.
   */
  private deriveTargetStatusForTask(task: {
    evidenceAutomations: Array<{
      runs: Array<{ evaluationStatus: string | null }>;
    }>;
    integrationCheckRuns: Array<{
      checkId: string;
      status: string;
      createdAt: Date;
    }>;
  }): 'done' | 'todo' | 'failed' {
    const hasCustom = task.evidenceAutomations.length > 0;
    const customPassing =
      hasCustom &&
      task.evidenceAutomations.every(
        (a) => a.runs[0]?.evaluationStatus === 'pass',
      );

    const hasApp = task.integrationCheckRuns.length > 0;
    let appPassing = false;
    if (hasApp) {
      // Order-independent latest-per-checkId selection. Matches the scheduler's
      // getTargetStatus so behavior doesn't silently depend on whether the
      // caller's query ordered runs by createdAt.
      const latestByCheckId = new Map<
        string,
        { status: string; createdAt: Date }
      >();
      for (const run of task.integrationCheckRuns) {
        const existing = latestByCheckId.get(run.checkId);
        if (!existing || run.createdAt > existing.createdAt) {
          latestByCheckId.set(run.checkId, run);
        }
      }
      appPassing = Array.from(latestByCheckId.values()).every(
        (r) => r.status === 'success',
      );
    }

    if (!hasCustom && !hasApp) return 'todo';

    const allPassing =
      (!hasCustom || customPassing) && (!hasApp || appPassing);
    return allPassing ? 'done' : 'failed';
  }

  async updateLastSync(connectionId: string): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      lastSyncAt: new Date(),
    });
  }

  async updateNextSync(
    connectionId: string,
    nextSyncAt: Date,
  ): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      nextSyncAt,
    });
  }

  async updateSyncCadence(
    connectionId: string,
    syncCadence: string | null,
  ): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      syncCadence,
    });
  }

  async updateConnectionMetadata(
    connectionId: string,
    metadata: Record<string, unknown>,
  ): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      metadata,
    });
  }
}
