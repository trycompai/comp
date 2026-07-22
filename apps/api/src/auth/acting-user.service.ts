import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import type { AuthenticatedRequest } from './types';

/**
 * The auth flow that produced the userId we'll attribute a mutation to.
 *
 *   - 'session' — req.userId set by better-auth from a session cookie / bearer token.
 *   - 'service-token-acting' — service token caller passed an `x-user-id` header
 *     which HybridAuthGuard validated against Member and set on req.userId.
 *   - 'org-owner-fallback' — API key (or service token without x-user-id)
 *     resolved to the org's oldest owner. This keeps mutations API-callable
 *     without forcing callers to manage user IDs themselves.
 */
export type ActingUserSource =
  | 'session'
  | 'service-token-acting'
  | 'api-key-creator'
  | 'org-owner-fallback';

export interface ResolvedActingUser {
  /** User ID to attribute the mutation to. Null only when no fallback was
   *  available (e.g. an org with zero owner-role members — caller should
   *  surface a 400 with an actionable message). */
  userId: string | null;
  /** Member (org membership) to attribute the mutation to, when known. Set for
   *  the api-key-creator path; undefined for session/owner-fallback (the audit
   *  row's memberId is optional). */
  memberId?: string;
  source: ActingUserSource;
  /** Short label for audit log descriptions. Only set when source is
   *  'org-owner-fallback' — session and explicit service-token acting
   *  don't need to call out automation in the audit trail. */
  callerLabel?: string;
}

/**
 * Resolves the user that a mutation should be attributed to, accepting any
 * supported auth method. This is the single, shared way for write endpoints
 * to answer "whose userId should I record on this audit log / row?".
 *
 * Rules:
 *   1. Session callers — `req.userId` is already set by HybridAuthGuard.
 *      We return it without a DB query (zero overhead for the common UI path).
 *   2. Service tokens calling on behalf of a specific user — HybridAuthGuard
 *      sets `req.userId` from the `x-user-id` header after Member validation.
 *      Same short-circuit as session.
 *   3. API keys with a recorded creator — attribute to the member who created
 *      the key (if still an active member of the org), so the audit trail
 *      reflects who set up the automation.
 *   4. Everything else (legacy API keys with no recorded creator, keys whose
 *      creator was deactivated/removed, or service tokens without `x-user-id`)
 *      — no per-user identity exists, so we attribute to the org's OLDEST owner
 *      (deterministic + stable across deletes of newer owners), consistent with
 *      how 19+ other places in the codebase look up org owners
 *      (`Member.role.contains('owner')`).
 *
 * Returning null userId is a soft failure — callers must surface a 400 with
 * the org-needs-an-owner message rather than 500-ing on a Prisma FK error.
 */
@Injectable()
export class ActingUserResolver {
  private readonly logger = new Logger(ActingUserResolver.name);

  async resolve(
    req: AuthenticatedRequest,
    organizationId: string,
  ): Promise<ResolvedActingUser> {
    // Path 1 + 2 — session caller, or service token acting on behalf of a
    // specific user. HybridAuthGuard already set req.userId for both, so we
    // just classify which one and short-circuit. No DB query.
    if (req.userId) {
      return {
        userId: req.userId,
        source: req.isServiceToken ? 'service-token-acting' : 'session',
      };
    }

    // Path 3 — API key with a recorded creator who is still an active member
    // of this org. Attribute to that member's user so the audit trail reflects
    // who set up the automation, not the org owner. Legacy keys (no recorded
    // creator) and keys whose creator has been deactivated/removed fall through
    // to the owner fallback below.
    if (req.isApiKey && req.apiKeyCreatedByMemberId) {
      const creator = await db.member.findFirst({
        where: {
          id: req.apiKeyCreatedByMemberId,
          organizationId,
          deactivated: false,
          isActive: true,
        },
        select: { userId: true },
      });
      if (creator) {
        return {
          userId: creator.userId,
          memberId: req.apiKeyCreatedByMemberId,
          source: 'api-key-creator',
          callerLabel: this.buildCallerLabel(req),
        };
      }
    }

    // Path 4 — fall back to the org's owner.
    const ownerUserId = await this.findOrgOwnerUserId(organizationId);
    if (!ownerUserId) {
      // No owner found. Don't invent one — the caller should reject the
      // mutation with a clear message so the customer can fix the role
      // assignment themselves.
      this.logger.warn(
        `No owner-role member found for org ${organizationId}; mutation cannot be attributed.`,
      );
      return {
        userId: null,
        source: 'org-owner-fallback',
        callerLabel: this.buildCallerLabel(req),
      };
    }

    return {
      userId: ownerUserId,
      source: 'org-owner-fallback',
      callerLabel: this.buildCallerLabel(req),
    };
  }

  /**
   * Find the oldest ACTIVE owner of an organization. Oldest is deterministic
   * and stable: removing a recently-added owner doesn't change the attribution
   * target, removing the oldest one just promotes the next one. Matches the
   * pattern used elsewhere (e.g. tasks/tasks.service.ts:getApiKeyActorUserId).
   *
   * Member.role is a comma-separated string (e.g. "owner,admin"), so we use
   * Prisma's `contains` filter — same query shape as the 19+ other owner
   * lookups in this codebase.
   *
   * `deactivated: false` + `isActive: true` excludes offboarded owners so we
   * don't attribute new mutations to a user who no longer has org access.
   */
  private async findOrgOwnerUserId(
    organizationId: string,
  ): Promise<string | null> {
    const owner = await db.member.findFirst({
      where: {
        organizationId,
        deactivated: false,
        isActive: true,
        role: { contains: 'owner' },
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    return owner?.userId ?? null;
  }

  /**
   * Produces the short string that downstream audit-log descriptions
   * prepend (e.g. `[via API key "CI Pipeline"]`). The caller decides where
   * to put it; this helper just standardises the wording.
   *
   * Returns 'via API key' / 'via service token' / 'via API' as a graceful
   * fallback so we always emit SOMETHING rather than drop attribution.
   */
  private buildCallerLabel(req: AuthenticatedRequest): string {
    if (req.isApiKey) {
      return req.apiKeyName
        ? `via API key "${req.apiKeyName}"`
        : 'via API key';
    }
    if (req.isServiceToken) {
      return req.serviceName
        ? `via service "${req.serviceName}"`
        : 'via service token';
    }
    // Should never reach here — Path 1/2 would have short-circuited — but
    // we return a sane default rather than throw.
    return 'via API';
  }
}
