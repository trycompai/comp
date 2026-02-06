import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth module
vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

// Mock db module
vi.mock('@db', async () => {
  const { mockDb } = await import('@/test-utils/mocks/db');
  const actual = await vi.importActual<typeof import('@db')>('@db');
  return { ...actual, db: mockDb };
});

// Mock dependencies that the layout imports but we don't need to test
vi.mock('@/app/posthog', () => ({
  getFeatureFlags: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/app/s3', () => ({
  s3Client: null,
  APP_AWS_ORG_ASSETS_BUCKET: null,
}));
vi.mock('@/components/trigger-token-provider', () => ({
  TriggerTokenProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/data/getOrganizations', () => ({
  getOrganizations: vi.fn().mockResolvedValue({ organizations: [] }),
}));
vi.mock('@/lib/permissions', () => ({
  canAccessApp: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/permissions.server', () => ({
  resolveUserPermissions: vi.fn().mockResolvedValue([]),
}));
vi.mock('./components/AppShellWrapper', () => ({
  AppShellWrapper: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));
vi.mock('@aws-sdk/client-s3', () => ({ GetObjectCommand: vi.fn() }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }));

import { createMockSession, setupAuthMocks } from '@/test-utils/mocks/auth';
import { mockDb } from '@/test-utils/mocks/db';

const { default: Layout } = await import('./layout');

describe('Layout activeOrganizationId sync', () => {
  const requestedOrgId = 'org_requested';
  const sessionId = 'session_test123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: org exists, member exists, onboarding complete
    mockDb.organization.findUnique.mockResolvedValue({
      id: requestedOrgId,
      hasAccess: true,
      onboardingCompleted: true,
    });
    mockDb.member.findFirst.mockResolvedValue({
      id: 'member_1',
      userId: 'user_test123',
      organizationId: requestedOrgId,
      role: 'owner',
      deactivated: false,
    });
    mockDb.onboarding.findFirst.mockResolvedValue(null);
    mockDb.session.update.mockResolvedValue({});
  });

  it('should update session directly in DB when session org differs from URL org', async () => {
    setupAuthMocks({
      session: createMockSession({ id: sessionId, activeOrganizationId: 'org_other' }),
    });

    await Layout({
      children: null,
      params: Promise.resolve({ orgId: requestedOrgId }),
    });

    expect(mockDb.session.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: { activeOrganizationId: requestedOrgId },
    });
  });

  it('should update session when activeOrganizationId is null', async () => {
    setupAuthMocks({
      session: createMockSession({ id: sessionId, activeOrganizationId: null }),
    });

    await Layout({
      children: null,
      params: Promise.resolve({ orgId: requestedOrgId }),
    });

    expect(mockDb.session.update).toHaveBeenCalledWith({
      where: { id: sessionId },
      data: { activeOrganizationId: requestedOrgId },
    });
  });

  it('should NOT update session when session org matches URL org', async () => {
    setupAuthMocks({
      session: createMockSession({ id: sessionId, activeOrganizationId: requestedOrgId }),
    });

    await Layout({
      children: null,
      params: Promise.resolve({ orgId: requestedOrgId }),
    });

    expect(mockDb.session.update).not.toHaveBeenCalled();
  });

  it('should continue rendering even if session update fails', async () => {
    setupAuthMocks({
      session: createMockSession({ id: sessionId, activeOrganizationId: 'org_other' }),
    });
    mockDb.session.update.mockRejectedValue(new Error('db update failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    const result = await Layout({
      children: null,
      params: Promise.resolve({ orgId: requestedOrgId }),
    });

    expect(result).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Layout] Failed to sync activeOrganizationId:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
