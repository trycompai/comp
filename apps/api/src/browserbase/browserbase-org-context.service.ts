import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { db } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';

export const PENDING_CONTEXT_ID = '__PENDING__';
const ORG_CONTEXT_MAX_WAIT_MS = 10_000;
const ORG_CONTEXT_POLL_MS = 200;

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
    return this.getOrCreateOrgContextWithinDeadline({
      organizationId,
      deadlineMs: Date.now() + ORG_CONTEXT_MAX_WAIT_MS,
    });
  }

  private async getOrCreateOrgContextWithinDeadline(input: {
    organizationId: string;
    deadlineMs: number;
  }): Promise<{ contextId: string; isNew: boolean }> {
    if (Date.now() >= input.deadlineMs) {
      this.throwContextTimeout(input.organizationId);
    }

    const existing = await db.browserbaseContext.findUnique({
      where: { organizationId: input.organizationId },
    });

    if (existing && existing.contextId !== PENDING_CONTEXT_ID) {
      return { contextId: existing.contextId, isNew: false };
    }

    if (existing) {
      return this.waitForOrgContext(input);
    }

    try {
      await db.browserbaseContext.create({
        data: {
          organizationId: input.organizationId,
          contextId: PENDING_CONTEXT_ID,
        },
      });
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) throw error;
      return this.waitForOrgContext(input);
    }

    return this.createAndStoreOrgContext(input.organizationId);
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

  private async waitForOrgContext(input: {
    organizationId: string;
    deadlineMs: number;
  }): Promise<{ contextId: string; isNew: boolean }> {
    while (Date.now() < input.deadlineMs) {
      const current = await db.browserbaseContext.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (current && current.contextId !== PENDING_CONTEXT_ID) {
        return { contextId: current.contextId, isNew: false };
      }

      if (!current) return await this.getOrCreateOrgContextWithinDeadline(input);
      await delay(
        Math.min(
          ORG_CONTEXT_POLL_MS,
          Math.max(0, input.deadlineMs - Date.now()),
        ),
      );
    }

    this.throwContextTimeout(input.organizationId);
  }

  private throwContextTimeout(organizationId: string): never {
    this.logger.warn(
      `Timed out waiting for Browserbase context creation for org ${organizationId}`,
    );
    throw new RequestTimeoutException(
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
