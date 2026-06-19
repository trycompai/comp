import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import {
  defaultProfileDisplayName,
  normalizeHostnameFromUrl,
  normalizeLoginIdentity,
} from './browserbase-url';
import { BrowserbaseSessionService } from './browserbase-session.service';

const PENDING_CONTEXT_ID = '__PENDING__';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPrismaUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2002';
};

export interface AuthProfileInput {
  organizationId: string;
  url: string;
  displayName?: string;
  loginIdentity?: string;
  vaultProvider?: string;
  vaultExternalItemRef?: string;
  vaultConnectionId?: string;
}

@Injectable()
export class BrowserAuthProfileService {
  private readonly logger = new Logger(BrowserAuthProfileService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
  ) {}

  async listProfiles(organizationId: string) {
    return db.browserAuthProfile.findMany({
      where: { organizationId },
      orderBy: [{ hostname: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getProfile({
    profileId,
    organizationId,
  }: {
    profileId: string;
    organizationId: string;
  }) {
    return db.browserAuthProfile.findFirst({
      where: { id: profileId, organizationId },
    });
  }

  async getOrCreateProfileFromUrl(input: AuthProfileInput) {
    const hostname = normalizeHostnameFromUrl(input.url);
    const loginIdentity = normalizeLoginIdentity(input.loginIdentity);

    const existing = await db.browserAuthProfile.findUnique({
      where: {
        organizationId_hostname_loginIdentity: {
          organizationId: input.organizationId,
          hostname,
          loginIdentity,
        },
      },
    });

    if (existing) {
      return { profile: existing, isNew: false };
    }

    const contextId = await this.resolveInitialContextId(input.organizationId);

    try {
      const profile = await db.browserAuthProfile.create({
        data: {
          organizationId: input.organizationId,
          hostname,
          loginIdentity,
          displayName: input.displayName?.trim() || defaultProfileDisplayName(hostname),
          contextId,
          lastAuthCheckUrl: input.url,
          vaultProvider: input.vaultProvider,
          vaultExternalItemRef: input.vaultExternalItemRef,
          vaultConnectionId: input.vaultConnectionId,
        },
      });
      return { profile, isNew: true };
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }

      const profile = await db.browserAuthProfile.findUniqueOrThrow({
        where: {
          organizationId_hostname_loginIdentity: {
            organizationId: input.organizationId,
            hostname,
            loginIdentity,
          },
        },
      });
      return { profile, isNew: false };
    }
  }

  async resolveProfileForTarget(input: {
    organizationId: string;
    targetUrl: string;
    profileId?: string;
  }) {
    if (input.profileId) {
      const profile = await this.getProfile({
        profileId: input.profileId,
        organizationId: input.organizationId,
      });
      if (!profile) {
        throw new Error('Browser auth profile not found');
      }
      return profile;
    }

    const hostname = normalizeHostnameFromUrl(input.targetUrl);
    const profiles = await db.browserAuthProfile.findMany({
      where: { organizationId: input.organizationId, hostname },
      orderBy: { updatedAt: 'desc' },
    });

    const verified = profiles.find((profile) => profile.status === 'verified');
    if (verified) return verified;
    if (profiles[0]) return profiles[0];

    const created = await this.getOrCreateProfileFromUrl({
      organizationId: input.organizationId,
      url: input.targetUrl,
    });
    return created.profile;
  }

  async startProfileSession(input: {
    organizationId: string;
    profileId: string;
  }): Promise<{ sessionId: string; liveViewUrl: string }> {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new Error('Browser auth profile not found');
    }
    return this.sessions.createSessionWithContext(profile.contextId);
  }

  async verifyProfileSession(input: {
    organizationId: string;
    profileId: string;
    sessionId: string;
    url: string;
  }) {
    const profile = await this.getProfile({
      organizationId: input.organizationId,
      profileId: input.profileId,
    });
    if (!profile) {
      throw new Error('Browser auth profile not found');
    }

    const auth = await this.sessions.checkLoginStatus(input.sessionId, input.url);
    const status = auth.isLoggedIn ? 'verified' : 'needs_reauth';
    const updated = await db.browserAuthProfile.update({
      where: { id: profile.id },
      data: {
        status,
        lastVerifiedAt: auth.isLoggedIn ? new Date() : profile.lastVerifiedAt,
        lastAuthCheckUrl: input.url,
        blockedReason: auth.isLoggedIn ? null : 'Login verification failed.',
      },
    });

    return { profile: updated, auth };
  }

  async markNeedsReauth(input: {
    organizationId: string;
    profileId: string;
    reason?: string;
  }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new Error('Browser auth profile not found');
    }

    return db.browserAuthProfile.update({
      where: { id: profile.id },
      data: {
        status: 'needs_reauth',
        blockedReason: input.reason ?? 'Authentication needs to be refreshed.',
      },
    });
  }

  async markBlocked(input: {
    organizationId: string;
    profileId: string;
    reason: string;
  }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new Error('Browser auth profile not found');
    }

    return db.browserAuthProfile.update({
      where: { id: profile.id },
      data: {
        status: 'blocked',
        blockedReason: input.reason,
      },
    });
  }

  async getOrCreateOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string; isNew: boolean }> {
    const existing = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });

    if (existing && existing.contextId !== PENDING_CONTEXT_ID) {
      return { contextId: existing.contextId, isNew: false };
    }

    try {
      await db.browserbaseContext.create({
        data: { organizationId, contextId: PENDING_CONTEXT_ID },
      });

      const contextId = await this.sessions.createBrowserbaseContext();

      await db.browserbaseContext.update({
        where: { organizationId },
        data: { contextId },
      });

      return { contextId, isNew: true };
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }
    }

    return this.waitForOrgContext(organizationId);
  }

  async getOrgContext(organizationId: string): Promise<{ contextId: string } | null> {
    const context = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });

    if (!context || context.contextId === PENDING_CONTEXT_ID) return null;
    return { contextId: context.contextId };
  }

  private async resolveInitialContextId(organizationId: string): Promise<string> {
    const legacy = await this.getOrgContext(organizationId);
    if (legacy) return legacy.contextId;
    return this.sessions.createBrowserbaseContext();
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

      if (!current) {
        return await this.getOrCreateOrgContext(organizationId);
      }

      await delay(pollMs);
    }

    this.logger.warn(`Timed out waiting for Browserbase context creation for org ${organizationId}`);
    throw new Error('Browser context initialization is taking too long. Please retry.');
  }
}
