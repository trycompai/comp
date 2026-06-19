import {
  ConflictException,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { db } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';

export const PENDING_CONTEXT_ID = '__PENDING__';
const PENDING_CONTEXT_PREFIX = `${PENDING_CONTEXT_ID}:`;
const ORG_CONTEXT_MAX_WAIT_MS = 10_000;
const ORG_CONTEXT_POLL_MS = 200;
const ORG_CONTEXT_STALE_MS = 60_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isPrismaUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2002';
};

const isPendingContextId = (contextId: string): boolean =>
  contextId === PENDING_CONTEXT_ID ||
  contextId.startsWith(PENDING_CONTEXT_PREFIX);

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

    if (existing && !isPendingContextId(existing.contextId)) {
      return { contextId: existing.contextId, isNew: false };
    }

    if (existing) {
      const claimId = await this.claimStalePendingOrgContext({
        organizationId: input.organizationId,
        contextId: existing.contextId,
        updatedAt: existing.updatedAt,
      });
      if (claimId) {
        return this.createAndStoreOrgContext({
          organizationId: input.organizationId,
          pendingContextId: claimId,
        });
      }
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

    return this.createAndStoreOrgContext({
      organizationId: input.organizationId,
      pendingContextId: PENDING_CONTEXT_ID,
    });
  }

  async getOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string } | null> {
    const context = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });
    if (!context || isPendingContextId(context.contextId)) return null;
    return { contextId: context.contextId };
  }

  private async createAndStoreOrgContext(input: {
    organizationId: string;
    pendingContextId: string;
  }): Promise<{ contextId: string; isNew: boolean }> {
    try {
      const contextId = await this.sessions.createBrowserbaseContext();
      const updated = await db.browserbaseContext.updateMany({
        where: {
          organizationId: input.organizationId,
          contextId: input.pendingContextId,
        },
        data: { contextId },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Browser context initialization was superseded. Please retry.',
        );
      }
      return { contextId, isNew: true };
    } catch (error) {
      await this.clearPendingOrgContext({
        organizationId: input.organizationId,
        pendingContextId: input.pendingContextId,
      });
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

      if (current && !isPendingContextId(current.contextId)) {
        return { contextId: current.contextId, isNew: false };
      }

      if (!current) {
        return await this.getOrCreateOrgContextWithinDeadline(input);
      }

      const claimId = await this.claimStalePendingOrgContext({
        organizationId: input.organizationId,
        contextId: current.contextId,
        updatedAt: current.updatedAt,
      });
      if (claimId) {
        return this.createAndStoreOrgContext({
          organizationId: input.organizationId,
          pendingContextId: claimId,
        });
      }
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

  private async claimStalePendingOrgContext(input: {
    organizationId: string;
    contextId: string;
    updatedAt: Date;
  }): Promise<string | null> {
    const staleBefore = new Date(Date.now() - ORG_CONTEXT_STALE_MS);
    if (input.updatedAt > staleBefore) return null;

    const claimId = `${PENDING_CONTEXT_PREFIX}${randomUUID()}`;
    const updated = await db.browserbaseContext.updateMany({
      where: {
        organizationId: input.organizationId,
        contextId: input.contextId,
        updatedAt: { lte: staleBefore },
      },
      data: { contextId: claimId },
    });

    if (updated.count !== 1) return null;
    this.logger.warn(
      `Recovering stale Browserbase context initialization for org ${input.organizationId}`,
    );
    return claimId;
  }

  private async clearPendingOrgContext(input: {
    organizationId: string;
    pendingContextId: string;
  }): Promise<void> {
    try {
      await db.browserbaseContext.deleteMany({
        where: {
          organizationId: input.organizationId,
          contextId: input.pendingContextId,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to clear pending Browserbase context', {
        organizationId: input.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
