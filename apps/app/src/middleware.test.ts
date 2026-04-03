import { beforeEach, describe, expect, it, vi } from 'vitest';

// Then import other test utilities
import { createMockRequest } from '@/test-utils/helpers/middleware';
import { createMockSession, setupAuthMocks } from '@/test-utils/mocks/auth';

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

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('x-pathname')).toBe('/org_123/dashboard');
    });

    it('should allow org routes to continue to the layout for access checks', async () => {
      // Arrange
      setupAuthMocks();

      const request = await createMockRequest('/org_OTHER/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
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
    it('should allow access to unprotected routes', async () => {
      // Arrange
      const unprotectedRoutes = ['/upgrade/org_123', '/setup', '/invite/abc123'];

      for (const route of unprotectedRoutes) {
        vi.clearAllMocks();
        setupAuthMocks();
        const request = await createMockRequest(route, { authenticated: true });

        // Act
        const response = await proxy(request);

        // Assert
        expect(response.status).toBe(200);
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

  describe('Organization Routing', () => {
    it('should allow authenticated org routes to continue', async () => {
      // Arrange
      setupAuthMocks();

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should redirect unauthenticated org routes to /auth', async () => {
      // Arrange
      const request = await createMockRequest('/org_123/dashboard');

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
    });

    it('should allow org routes through when session state is handled later', async () => {
      // Arrange
      setupAuthMocks({ session: null, user: null });

      const request = await createMockRequest('/org_123/dashboard', {
        authenticated: true,
      });

      // Act
      const response = await proxy(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Security Boundaries', () => {
    it('should handle malicious org IDs without crashing', async () => {
      // Arrange
      setupAuthMocks();

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
