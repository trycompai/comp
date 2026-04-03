import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';

interface StartLogParams {
  connectionId: string;
  organizationId: string;
  provider: string;
  eventType: string;
  triggeredBy?: string;
  userId?: string;
}

@Injectable()
export class IntegrationSyncLoggerService {
  private readonly logger = new Logger(IntegrationSyncLoggerService.name);

  async startLog({
    connectionId,
    organizationId,
    provider,
    eventType,
    triggeredBy,
    userId,
  }: StartLogParams): Promise<string> {
    const log = await db.integrationSyncLog.create({
      data: {
        connectionId,
        organizationId,
        provider,
        eventType,
        status: 'running',
        startedAt: new Date(),
        triggeredBy: triggeredBy ?? null,
        userId: userId ?? null,
      },
    });

    this.logger.log(
      `Sync log started: ${log.id} (${provider}/${eventType})`,
    );

    return log.id;
  }

  async completeLog(id: string, result: Record<string, unknown>): Promise<void> {
    const log = await db.integrationSyncLog.findUnique({ where: { id } });
    if (!log) {
      this.logger.warn(`Sync log not found: ${id}`);
      return;
    }

    const now = new Date();
    const durationMs = log.startedAt
      ? now.getTime() - log.startedAt.getTime()
      : null;

    await db.integrationSyncLog.update({
      where: { id },
      data: {
        status: 'success',
        completedAt: now,
        durationMs,
        result: result as Prisma.InputJsonValue,
      },
    });
  }

  async failLog(id: string, error: string): Promise<void> {
    const log = await db.integrationSyncLog.findUnique({ where: { id } });
    if (!log) {
      this.logger.warn(`Sync log not found: ${id}`);
      return;
    }

    const now = new Date();
    const durationMs = log.startedAt
      ? now.getTime() - log.startedAt.getTime()
      : null;

    await db.integrationSyncLog.update({
      where: { id },
      data: {
        status: 'failed',
        completedAt: now,
        durationMs,
        error,
      },
    });
  }
}
