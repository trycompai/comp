import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth module first
vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

// Mock db module - include Prisma enum exports so mocked auth helpers work
vi.mock('@db', async () => {
  const { mockDb } = await import('@/test-utils/mocks/db');
  return {
    db: mockDb,
    Departments: {
      none: 'none',
      admin: 'admin',
      gov: 'gov',
      hr: 'hr',
      it: 'it',
      itsm: 'itsm',
      qms: 'qms',
    },
  };
});

// Then import other test utilities
import { createMockRequest } from '@/test-utils/helpers/middleware';
import { createMockSession, setupAuthMocks } from '@/test-utils/mocks/auth';
import { mockDb } from '@/test-utils/mocks/db';

vi.mock('next/headers', () => ({
  headers: vi.fn(
    () =>
      new Map([
        ['x-pathname', '/'],
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'test-agent'],
      ]),
  ),
}));

// Import proxy after mocks are set up
const { proxy } = await import('./proxy');

/**
 * Helper: set up mockDb.member.findFirst to return a valid member record.
 * Call after setupAuthMocks() for tests where the user should pass the
 * membership check on org routes.
 */
function mockMembershipExists() {
  mockDb.member.findFirst.mockResolvedValue({ id: 'member_test123' });
}

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Basic Access', () => {
    it('should redirect unauthenticated users to /auth', async () => {
      // Arrange - no cookie, no session
      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/auth?redirectTo=%2Forg_123%2Fdashboard',
      );
    });

    it('should allow authenticated users to access their org', async () => {
      // Arrange
      setupAuthMocks();
      mockMembershipExists();

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('x-pathname')).toBe('/org_123/dashboard');
    });

    it('should prevent users from accessing orgs they do not belong to', async () => {
      // Arrange
      setupAuthMocks();

      // User is NOT a member of org_OTHER
      mockDb.member.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/org_OTHER/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should not check membership for non-org routes', async () => {
      // Arrange
      const nonOrgRoutes = ['/setup', '/upgrade/org_123', '/onboarding/org_123'];

      for (const route of nonOrgRoutes) {
        vi.clearAllMocks();
        setupAuthMocks();

        const request = await createMockRequest(route, { authenticated: true });

        // Act
        await proxy(request);

        // Assert - member.findFirst should NOT be called for non-org routes
        expect(mockDb.member.findFirst).not.toHaveBeenCalled();
      }
    });
  });

  describe('Setup/Onboarding Flow', () => {
    it('should allow access to root path without membership check', async () => {
      // Arrange
      const session = createMockSession({ activeOrganizationId: null });
      setupAuthMocks({ session });

      const request = await createMockRequest('/', { authenticated: true });

      // Act
      const response = await proxy(request);

      // Assert - root path is not an org route, no membership check
      expect(response.status).toBe(200);
      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
    });

    it('should allow access to /setup with intent param', async () => {
      // Arrange
      setupAuthMocks();

      const request = await createMockRequest('/setup', {
        searchParams: Promise.resolve({ intent: 'create-additional' }),
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Unprotected Routes', () => {
    it('should bypass membership check for unprotected routes', async () => {
      // Arrange
      const unprotectedRoutes = ['/upgrade/org_123', '/setup', '/invite/abc123'];

      for (const route of unprotectedRoutes) {
        vi.clearAllMocks();
        setupAuthMocks();
        const request = await createMockRequest(route, { authenticated: true });

        // Act
        await proxy(request);

        // Assert - should not call member.findFirst for non-org routes
        expect(mockDb.member.findFirst).not.toHaveBeenCalled();
      }
    });

    it('should allow unauthenticated access to invite routes', async () => {
      // Arrange - no cookie
      const request = await createMockRequest('/invite/abc123');

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should allow unauthenticated access to unsubscribe routes', async () => {
      // Arrange - no cookie
      const request = await createMockRequest('/unsubscribe/abc123');

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Organization Membership', () => {
    it('should call db.member.findFirst with correct parameters', async () => {
      // Arrange
      setupAuthMocks();
      mockMembershipExists();

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      await proxy(request);

      // Assert
      expect(mockDb.member.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user_test123',
          organizationId: 'org_123',
          deactivated: false,
        },
        select: { id: true },
      });
    });

    it('should return 403 when user is not a member of the org', async () => {
      // Arrange
      setupAuthMocks();
      mockDb.member.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/org_456/settings', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should allow access when user is a member of the org', async () => {
      // Arrange
      setupAuthMocks();
      mockMembershipExists();

      const request = await createMockRequest('/org_456/settings', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should not check membership when user has no session cookie', async () => {
      // Arrange - no cookie, so redirects to /auth before membership check
      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
    });

    it('should not check membership when session API returns null', async () => {
      // Arrange - has cookie but session is invalid/expired
      setupAuthMocks({ session: null, user: null });

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert - has token so passes cookie check, but session is null
      // so membership check is skipped (passthrough to layout which will handle it)
      expect(response.status).toBe(200);
      expect(mockDb.member.findFirst).not.toHaveBeenCalled();
    });

    it('should exclude deactivated members from membership check', async () => {
      // Arrange
      setupAuthMocks();
      // findFirst with deactivated: false returns null for deactivated members
      mockDb.member.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(403);
      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deactivated: false,
          }),
        }),
      );
    });
  });

  describe('Security Boundaries', () => {
    it('should handle malicious org IDs without crashing', async () => {
      // Arrange
      setupAuthMocks();
      mockMembershipExists();

      const maliciousRequests = [
        '/org_../../admin',
        '/org_%00nullbyte/settings',
        '/org_<script>alert(1)</script>/dashboard',
        '/org_' + 'x'.repeat(1000) + '/settings',
      ];

      for (const path of maliciousRequests) {
        const request = await createMockRequest(path, { authenticated: true });

        // Act
        const response = await proxy(request);

        // Assert - should not crash
        expect(response.status).not.toBe(500);
      }
    });
  });
});
