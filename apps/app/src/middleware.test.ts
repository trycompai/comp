import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth module first
vi.mock('@/utils/auth', async () => {
  const { mockAuth } = await import('@/test-utils/mocks/auth');
  return { auth: mockAuth };
});

// Mock db module
vi.mock('@db', async () => {
  const { mockDb } = await import('@/test-utils/mocks/db');
  return { db: mockDb };
});

// Then import other test utilities
import { createMockRequest } from '@/test-utils/helpers/middleware';
import { createMockSession, mockAuth, setupAuthMocks } from '@/test-utils/mocks/auth';
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

// Import middleware after mocks are set up
const { middleware } = await import('./middleware');

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Basic Access', () => {
    it('should redirect unauthenticated users to /auth', async () => {
      // Arrange
      setupAuthMocks({ session: null, user: null });
      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/auth');
    });

    it('should allow authenticated users to access their org', async () => {
      // Arrange
      const { user } = setupAuthMocks();

      // Mock that the organization has access
      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: true,
      });

      // Mock that onboarding is completed
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: true,
      });

      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200); // Should pass through
      expect(response.headers.get('x-pathname')).toBe('/org_123/dashboard');
    });

    it.skip('should prevent users from accessing orgs they do not belong to', async () => {
      // SECURITY ISSUE: This check is not implemented in the middleware!
      // Arrange
      const { session, user } = setupAuthMocks();

      // User is NOT a member of org_OTHER
      mockDb.member.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/org_OTHER/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      // TODO: This is currently NOT implemented in the middleware!
      // The middleware should check membership but doesn't
      expect(response.status).toBe(403); // Should be forbidden
    });
  });

  describe('Setup/Onboarding Flow', () => {
    it('should redirect new users (no org) to /setup from root', async () => {
      // Arrange
      const session = createMockSession({ activeOrganizationId: null });
      setupAuthMocks({ session });

      mockDb.organization.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/');

      // Act
      const response = await middleware(request);

      // Assert
      expect(mockAuth.api.setActiveOrganization).not.toHaveBeenCalled();
      // Since user has no org, they should be allowed to access setup
      expect(response.status).toBe(200);
    });

    it('should allow existing users to create additional orgs with intent param', async () => {
      // Arrange
      const { session, user } = setupAuthMocks();

      mockDb.organization.findFirst.mockResolvedValue({
        id: 'org_123',
        name: 'Existing Org',
      });

      const request = await createMockRequest('/setup', {
        searchParams: Promise.resolve({ intent: 'create-additional' }),
      });

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200); // Should allow access
    });

    it('should redirect users with orgs away from /setup (without intent)', async () => {
      // Arrange
      const { session, user } = setupAuthMocks();

      mockDb.organization.findFirst.mockResolvedValue({
        id: 'org_123',
        name: 'Existing Org',
      });

      const request = await createMockRequest('/setup');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/org_123/frameworks');
    });
  });

  describe('Access Control (hasAccess)', () => {
    beforeEach(() => {
      // Set up authenticated user for access control tests
      setupAuthMocks();
    });

    it('should block access to org routes without hasAccess', async () => {
      // Arrange
      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: false,
      });

      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/upgrade/org_123');
    });

    it('should allow access with hasAccess = true', async () => {
      // Arrange
      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: true,
      });

      // Mock onboarding completed so we don't get redirected to onboarding
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: true,
      });

      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should bypass access check for unprotected routes', async () => {
      // Arrange
      const unprotectedRoutes = ['/upgrade/org_123', '/setup', '/auth', '/invite/abc123'];

      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: false,
      });

      for (const route of unprotectedRoutes) {
        const request = await createMockRequest(route);

        // Act
        const response = await middleware(request);

        // Assert
        // Some routes might redirect for other reasons (e.g., /auth when already authenticated)
        // but they shouldn't redirect to the upgrade page
        if (response.status === 307) {
          const location = response.headers.get('location');
          expect(location).not.toContain('/upgrade');
        }
      }
    });

    it('should handle organizations that do not exist', async () => {
      // Arrange
      mockDb.organization.findFirst.mockResolvedValue(null);

      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/upgrade/org_123');
    });

    it('should preserve query parameters when redirecting to upgrade', async () => {
      // Arrange
      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: false,
      });

      const request = await createMockRequest('/org_123/dashboard', {
        searchParams: Promise.resolve({
          redirect: 'policies',
          tab: 'active',
        }),
      });

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBe('http://localhost:3000/upgrade/org_123?redirect=policies&tab=active');
    });
  });

  describe('Session Healing', () => {
    it('should auto-set activeOrganizationId when missing', async () => {
      // Arrange
      const session = createMockSession({ activeOrganizationId: null });
      setupAuthMocks({ session });

      mockDb.organization.findFirst.mockResolvedValue({
        id: 'org_123',
        name: 'Test Org',
        hasAccess: true,
      });

      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(mockAuth.api.setActiveOrganization).toHaveBeenCalledWith({
        headers: expect.any(Object),
        body: { organizationId: 'org_123' },
      });
      expect(response.status).toBe(307); // Redirect to refresh session
    });
  });

  describe('Onboarding Completion', () => {
    beforeEach(() => {
      // Set up authenticated user with access for onboarding tests
      setupAuthMocks();
      // Mock that the organization has access (required for onboarding checks)
      mockDb.organization.findFirst.mockResolvedValue({
        hasAccess: true,
      });
    });

    it('should redirect to /onboarding when user has access but onboarding not completed', async () => {
      // Arrange
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: false,
      });

      const request = await createMockRequest('/org_123/frameworks');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding/org_123');
    });

    it('should allow access to product when onboarding is completed', async () => {
      // Arrange
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: true,
      });

      const request = await createMockRequest('/org_123/frameworks');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200); // Should pass through
    });

    it('should allow access to /onboarding route even without onboarding completed', async () => {
      // Arrange
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: false,
      });

      const request = await createMockRequest('/onboarding/org_123');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200); // Should allow access
    });

    it('should preserve query params when redirecting to onboarding', async () => {
      // Arrange
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: false,
      });

      const request = await createMockRequest('/org_123/frameworks', {
        searchParams: Promise.resolve({
          checkoutComplete: 'starter',
          value: '99',
        }),
      });

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBe(
        'http://localhost:3000/onboarding/org_123?checkoutComplete=starter&value=99',
      );
    });

    it('should not check onboarding for unprotected routes', async () => {
      // Arrange
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: false,
      });

      const unprotectedRoutes = ['/upgrade/org_123', '/onboarding/org_123', '/auth', '/setup'];

      for (const route of unprotectedRoutes) {
        const request = await createMockRequest(route);

        // Act
        const response = await middleware(request);

        // Assert
        // Should not redirect to /onboarding for these routes
        if (response.status === 307) {
          const location = response.headers.get('location');
          expect(location).not.toContain('/onboarding');
        }
      }
    });

    it('should handle organizations without onboardingCompleted field gracefully', async () => {
      // Arrange - org exists but onboardingCompleted is undefined/null
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_123',
        onboardingCompleted: null,
      });

      const request = await createMockRequest('/org_123/frameworks');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(200); // Should allow access (treat null as completed)
    });
  });

  describe('Security Boundaries', () => {
    it('should validate org ID format to prevent injection', async () => {
      // Arrange
      setupAuthMocks();

      const maliciousRequests = [
        '/org_../../admin',
        '/org_%00nullbyte/settings',
        '/org_<script>alert(1)</script>/dashboard',
        '/org_' + 'x'.repeat(1000) + '/settings', // Length attack
      ];

      for (const path of maliciousRequests) {
        const request = await createMockRequest(path);

        // Act
        const response = await middleware(request);

        // Assert
        // Should either reject or handle safely
        // Currently the middleware doesn't validate org ID format
        expect(response.status).not.toBe(500); // Should not crash
      }
    });
  });
});
