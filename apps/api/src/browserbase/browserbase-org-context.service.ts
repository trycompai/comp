import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';

export const PENDING_CONTEXT_ID = '__PENDING__';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isPrismaUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2002';
};

@Injectable()
export class BrowserbaseOrgContextService {
  private readonly logger = new Logger(BrowserbaseOrgContextService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
  ) {}

  async getOrCreateOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string; isNew: boolean }> {
    const existing = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });

    if (existing && existing.contextId !== PENDING_CONTEXT_ID) {
      return { contextId: existing.contextId, isNew: false };
    }

    if (existing) {
      return this.waitForOrgContext(organizationId);
    }

    try {
      await db.browserbaseContext.create({
        data: { organizationId, contextId: PENDING_CONTEXT_ID },
      });
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) throw error;
      return this.waitForOrgContext(organizationId);
    }

    return this.createAndStoreOrgContext(organizationId);
  }

  async getOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string } | null> {
    const context = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });
    if (!context || context.contextId === PENDING_CONTEXT_ID) return null;
    return { contextId: context.contextId };
  }

  private async createAndStoreOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string; isNew: boolean }> {
    try {
      const contextId = await this.sessions.createBrowserbaseContext();
      await db.browserbaseContext.update({
        where: { organizationId },
        data: { contextId },
      });
      return { contextId, isNew: true };
    } catch (error) {
      await this.clearPendingOrgContext(organizationId);
      throw error;
    }
  }

  private async waitForOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string; isNew: boolean }> {
    const maxWaitMs = 10_000;
    const pollMs = 200;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWaitMs) {
      const current = await db.browserbaseContext.findUnique({
        where: { organizationId },
      });

      if (current && current.contextId !== PENDING_CONTEXT_ID) {
        return { contextId: current.contextId, isNew: false };
      }

      if (!current) return await this.getOrCreateOrgContext(organizationId);
      await delay(pollMs);
    }

    this.logger.warn(
      `Timed out waiting for Browserbase context creation for org ${organizationId}`,
    );
    throw new Error(
      'Browser context initialization is taking too long. Please retry.',
    );
  }

  private async clearPendingOrgContext(organizationId: string): Promise<void> {
    try {
      await db.browserbaseContext.deleteMany({
        where: { organizationId, contextId: PENDING_CONTEXT_ID },
      });
    } catch (error) {
      this.logger.warn('Failed to clear pending Browserbase context', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
