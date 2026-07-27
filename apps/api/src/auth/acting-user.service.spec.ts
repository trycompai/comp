// Mock @db before importing the service so the Prisma client doesn't try
// to connect at import time in this unit-test env.
const mockDb = {
  member: {
    findFirst: jest.fn(),
  },
};

jest.mock('@db', () => ({ db: mockDb }));

import { ActingUserResolver } from './acting-user.service';
import type { AuthenticatedRequest } from './types';

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    organizationId: 'org_1',
    authType: 'session',
    isApiKey: false,
    isServiceToken: false,
    isPlatformAdmin: false,
    userRoles: null,
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

describe('ActingUserResolver', () => {
  let resolver: ActingUserResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new ActingUserResolver();
  });

  describe('session caller (short-circuit)', () => {
    it('returns req.userId without a DB query', async () => {
      const req = makeReq({
        userId: 'usr_session_alice',
        memberId: 'mem_session_alice',
        authType: 'session',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result).toEqual({
        userId: 'usr_session_alice',
        memberId: 'mem_session_alice',
        source: 'session',
      });
      // Critical regression guard — session auth must NEVER hit the DB
      // for owner lookup. That would be a perf regression on every UI call.
      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
    });

    it('does NOT include a callerLabel for session callers', async () => {
      // Session actions don't need automation-marker text in the audit log.
      const req = makeReq({ userId: 'usr_session_alice' });
      const result = await resolver.resolve(req, 'org_1');
      expect(result.callerLabel).toBeUndefined();
    });
  });

  describe('service token acting on behalf of a specific user', () => {
    it('returns the x-user-id userId set by HybridAuthGuard, source service-token-acting', async () => {
      // HybridAuthGuard already validated the x-user-id header against
      // Member and set req.userId. We classify it differently from session
      // for telemetry but don't need to re-validate.
      const req = makeReq({
        userId: 'usr_acting_bob',
        authType: 'service',
        isApiKey: false,
        isServiceToken: true,
        serviceName: 'Trigger.dev',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result).toEqual({
        userId: 'usr_acting_bob',
        source: 'service-token-acting',
      });
      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('API key caller (owner fallback)', () => {
    it('resolves to the org owner and labels the caller for the audit log', async () => {
      mockDb.member.findFirst.mockResolvedValueOnce({
        id: 'mem_owner_carol',
        userId: 'usr_owner_carol',
      });

      const req = makeReq({
        userId: undefined,
        authType: 'api-key',
        isApiKey: true,
        apiKeyId: 'apk_1',
        apiKeyName: 'CI Pipeline',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.userId).toBe('usr_owner_carol');
      // The fallback owner's member is surfaced too, for Member-FK sinks.
      expect(result.memberId).toBe('mem_owner_carol');
      expect(result.source).toBe('org-owner-fallback');
      expect(result.callerLabel).toBe('via API key "CI Pipeline"');
    });

    it('scopes the owner lookup to the calling org (cross-tenant safety)', async () => {
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_owner' });
      const req = makeReq({
        userId: undefined,
        authType: 'api-key',
        isApiKey: true,
        apiKeyName: 'X',
      });

      await resolver.resolve(req, 'org_target');

      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_target',
            role: { contains: 'owner' },
          }),
        }),
      );
    });

    it('filters out deactivated / inactive members so uploads cannot be attributed to offboarded owners', async () => {
      // Regression guard — without these filters, the oldest "owner"-role
      // Member would win even if the user has been deactivated/offboarded,
      // attributing API-driven mutations to someone who no longer has access.
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_owner' });
      const req = makeReq({
        userId: undefined,
        isApiKey: true,
        apiKeyName: 'X',
      });

      await resolver.resolve(req, 'org_1');

      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deactivated: false,
            isActive: true,
          }),
        }),
      );
    });

    it('picks the OLDEST owner deterministically (orderBy createdAt asc)', async () => {
      // Determinism matters — re-running the same automation should always
      // attribute to the same user, even if newer owners are added/removed.
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_oldest' });
      const req = makeReq({
        userId: undefined,
        isApiKey: true,
        apiKeyName: 'X',
      });

      await resolver.resolve(req, 'org_1');

      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('returns null userId (not throw) when the org has no owner-role members', async () => {
      // Soft failure — the controller surfaces a 400 with an actionable
      // message ("ensure your org has an owner"). Throwing here would
      // 500 instead, which is worse UX.
      mockDb.member.findFirst.mockResolvedValueOnce(null);
      const req = makeReq({
        userId: undefined,
        isApiKey: true,
        apiKeyName: 'X',
      });

      const result = await resolver.resolve(req, 'org_no_owner');

      expect(result.userId).toBeNull();
      expect(result.source).toBe('org-owner-fallback');
      // callerLabel still populated so the eventual 400 message can mention
      // which API key tried (helpful in customer support).
      expect(result.callerLabel).toBe('via API key "X"');
    });

    it('falls back to "via API key" when the key name is missing (defensive)', async () => {
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_owner' });
      const req = makeReq({
        userId: undefined,
        isApiKey: true,
        apiKeyName: undefined,
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.callerLabel).toBe('via API key');
    });
  });

  describe('API key with a recorded creator', () => {
    it("attributes to the creating member's user (source api-key-creator)", async () => {
      // Creator lookup returns an active member of the org.
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_creator_dave' });

      const req = makeReq({
        userId: undefined,
        authType: 'api-key',
        isApiKey: true,
        apiKeyId: 'apk_1',
        apiKeyName: 'Mariano CLI',
        apiKeyCreatedByMemberId: 'mem_creator',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.userId).toBe('usr_creator_dave');
      expect(result.memberId).toBe('mem_creator');
      expect(result.source).toBe('api-key-creator');
      expect(result.callerLabel).toBe('via API key "Mariano CLI"');
      // Single lookup: the creator, scoped to the org + active membership.
      // No owner fallback query is made.
      expect(mockDb.member.findFirst).toHaveBeenCalledTimes(1);
      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'mem_creator',
            organizationId: 'org_1',
            deactivated: false,
            isActive: true,
          }),
        }),
      );
    });

    it('falls back to the org owner when the creator is no longer an active member', async () => {
      // 1st findFirst = creator lookup (null → offboarded/removed),
      // 2nd findFirst = owner fallback.
      mockDb.member.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 'usr_owner_carol' });

      const req = makeReq({
        userId: undefined,
        authType: 'api-key',
        isApiKey: true,
        apiKeyId: 'apk_1',
        apiKeyName: 'Old Key',
        apiKeyCreatedByMemberId: 'mem_offboarded',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.userId).toBe('usr_owner_carol');
      expect(result.source).toBe('org-owner-fallback');
      expect(mockDb.member.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('service token without x-user-id (owner fallback)', () => {
    it('resolves to the org owner with a service-flavored caller label', async () => {
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_owner' });
      const req = makeReq({
        userId: undefined,
        authType: 'service',
        isServiceToken: true,
        serviceName: 'Trigger.dev',
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.userId).toBe('usr_owner');
      expect(result.source).toBe('org-owner-fallback');
      expect(result.callerLabel).toBe('via service "Trigger.dev"');
    });

    it('falls back to "via service token" when the service name is missing', async () => {
      mockDb.member.findFirst.mockResolvedValueOnce({ userId: 'usr_owner' });
      const req = makeReq({
        userId: undefined,
        isServiceToken: true,
        serviceName: undefined,
      });

      const result = await resolver.resolve(req, 'org_1');

      expect(result.callerLabel).toBe('via service token');
    });
  });
});
