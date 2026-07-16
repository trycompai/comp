import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import {
  defaultProfileDisplayName,
  normalizeHostnameFromUrl,
  normalizeLoginIdentity,
} from './browserbase-url';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileContextService } from './browser-auth-profile-context.service';
import {
  BrowserbaseOrgContextService,
  PENDING_CONTEXT_ID,
  isPrismaUniqueConstraintError,
} from './browserbase-org-context.service';

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
  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly orgContexts: BrowserbaseOrgContextService = new BrowserbaseOrgContextService(
      sessions,
    ),
    private readonly profileContexts: BrowserAuthProfileContextService = new BrowserAuthProfileContextService(
      sessions,
      orgContexts,
    ),
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
      return {
        profile: await this.profileContexts.ready(existing),
        isNew: false,
      };
    }

    try {
      const pendingProfile = await db.browserAuthProfile.create({
        data: {
          organizationId: input.organizationId,
          hostname,
          loginIdentity,
          displayName:
            input.displayName?.trim() || defaultProfileDisplayName(hostname),
          contextId: PENDING_CONTEXT_ID,
          lastAuthCheckUrl: input.url,
          vaultProvider: input.vaultProvider,
          vaultExternalItemRef: input.vaultExternalItemRef,
          vaultConnectionId: input.vaultConnectionId,
        },
      });
      const profile = await this.profileContexts.initialize({
        profileId: pendingProfile.id,
        organizationId: input.organizationId,
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
      return {
        profile: await this.profileContexts.ready(profile),
        isNew: false,
      };
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
        throw new NotFoundException('Browser auth profile not found');
      }
      return this.profileContexts.ready(profile);
    }

    const hostname = normalizeHostnameFromUrl(input.targetUrl);
    const profiles = await db.browserAuthProfile.findMany({
      where: { organizationId: input.organizationId, hostname },
      orderBy: { updatedAt: 'desc' },
    });

    const verified = profiles.find((profile) => profile.status === 'verified');
    if (verified) return this.profileContexts.ready(verified);
    if (profiles[0]) return this.profileContexts.ready(profiles[0]);

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
      throw new NotFoundException('Browser auth profile not found');
    }
    const readyProfile = await this.profileContexts.ready(profile);
    return this.sessions.createSessionWithContext(readyProfile.contextId);
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
      throw new NotFoundException('Browser auth profile not found');
    }
    this.assertUrlMatchesProfileHostname({
      url: input.url,
      profileHostname: profile.hostname,
    });
    await this.assertSessionMatchesProfile({
      sessionId: input.sessionId,
      profileContextId: profile.contextId,
    });

    const auth = await this.sessions.checkLoginStatus(
      input.sessionId,
      input.url,
    );
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

  async markVerified(input: { organizationId: string; profileId: string }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }
    // Avoid a needless write when the profile is already verified.
    if (profile.status === 'verified') return profile;

    return db.browserAuthProfile.update({
      where: { id: profile.id },
      data: {
        status: 'verified',
        lastVerifiedAt: new Date(),
        blockedReason: null,
      },
    });
  }

  async updateProfile(input: {
    organizationId: string;
    profileId: string;
    displayName?: string;
    url?: string;
  }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }

    const data: Prisma.BrowserAuthProfileUpdateInput = {};

    const name = input.displayName?.trim();
    if (name) data.displayName = name;

    if (input.url !== undefined) {
      data.lastAuthCheckUrl = input.url;
      // A different hostname means the saved session no longer applies — the
      // connection must be re-established. (Hostname is the connection identity,
      // so we don't reassign it here.)
      try {
        if (normalizeHostnameFromUrl(input.url) !== profile.hostname) {
          data.status = 'needs_reauth';
          data.blockedReason = 'Sign-in URL changed — reconnect required.';
        }
      } catch {
        // Ignore an unparseable URL — leave status untouched.
      }
    }

    return db.browserAuthProfile.update({
      where: { id: profile.id },
      data,
    });
  }

  async deleteProfile(input: { organizationId: string; profileId: string }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }
    await db.browserAuthProfile.delete({ where: { id: profile.id } });
    return { success: true, profile };
  }

  async markNeedsReauth(input: {
    organizationId: string;
    profileId: string;
    reason?: string;
  }) {
    const profile = await this.getProfile(input);
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
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
      throw new NotFoundException('Browser auth profile not found');
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
    return this.orgContexts.getOrCreateOrgContext(organizationId);
  }

  async getOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string } | null> {
    return this.orgContexts.getOrgContext(organizationId);
  }

  private assertUrlMatchesProfileHostname(input: {
    url: string;
    profileHostname: string;
  }): void {
    let hostname: string;
    try {
      hostname = normalizeHostnameFromUrl(input.url);
    } catch {
      throw new BadRequestException('Invalid verification URL');
    }

    if (hostname !== input.profileHostname) {
      throw new BadRequestException(
        'Verification URL must match the browser auth profile hostname.',
      );
    }
  }

  private async assertSessionMatchesProfile(input: {
    sessionId: string;
    profileContextId: string;
  }): Promise<void> {
    const sessionContextId = await this.sessions.getSessionContextId(
      input.sessionId,
    );
    if (sessionContextId === input.profileContextId) return;

    throw new BadRequestException(
      'Browser session does not belong to this auth profile.',
    );
  }
}
