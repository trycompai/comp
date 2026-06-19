import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, type BrowserAuthProfile } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserbaseOrgContextService } from './browserbase-org-context.service';
import { PENDING_CONTEXT_ID } from './browserbase-org-context.service';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class BrowserAuthProfileContextService {
  private readonly logger = new Logger(BrowserAuthProfileContextService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly orgContexts: BrowserbaseOrgContextService = new BrowserbaseOrgContextService(
      sessions,
    ),
  ) {}

  async initialize(input: {
    profileId: string;
    organizationId: string;
  }): Promise<BrowserAuthProfile> {
    try {
      const contextId = await this.resolveInitialContextId(
        input.organizationId,
      );
      return await db.browserAuthProfile.update({
        where: { id: input.profileId },
        data: { contextId },
      });
    } catch (error) {
      await this.deletePendingProfile(input.profileId);
      throw error;
    }
  }

  async ready(profile: BrowserAuthProfile): Promise<BrowserAuthProfile> {
    if (profile.contextId !== PENDING_CONTEXT_ID) return profile;
    return this.waitForProfileContext(profile.id);
  }

  private async resolveInitialContextId(
    organizationId: string,
  ): Promise<string> {
    const legacy = await this.orgContexts.getOrgContext(organizationId);
    if (legacy) return legacy.contextId;
    return this.sessions.createBrowserbaseContext();
  }

  private async waitForProfileContext(
    profileId: string,
  ): Promise<BrowserAuthProfile> {
    const maxWaitMs = 10_000;
    const pollMs = 200;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWaitMs) {
      const current = await db.browserAuthProfile.findUnique({
        where: { id: profileId },
      });

      if (current && current.contextId !== PENDING_CONTEXT_ID) {
        return current;
      }

      if (!current) {
        throw new NotFoundException('Browser auth profile not found');
      }

      await delay(pollMs);
    }

    this.logger.warn(
      `Timed out waiting for Browser auth profile context ${profileId}`,
    );
    throw new Error(
      'Browser profile initialization is taking too long. Please retry.',
    );
  }

  private async deletePendingProfile(profileId: string): Promise<void> {
    try {
      await db.browserAuthProfile.deleteMany({
        where: { id: profileId, contextId: PENDING_CONTEXT_ID },
      });
    } catch (error) {
      this.logger.warn('Failed to clear pending browser auth profile', {
        profileId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
