import { BadRequestException } from '@nestjs/common';

// The controller imports `db` from `@db` at module load; stub it so the test
// doesn't spin up a real Prisma client (markException delegates to the service).
jest.mock('@db', () => ({ db: {} }));

// The guard imports pull in @trycompai/auth → better-auth (ESM), which jest
// can't transform. We call controller methods directly (guards never run), so
// stub the guard modules to cut that import chain.
jest.mock('../auth/hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('../auth/permission.guard', () => ({ PermissionGuard: class {} }));

import { OffboardingChecklistController } from './offboarding-checklist.controller';
import type { AuthContext as AuthContextType } from '../auth/types';

describe('OffboardingChecklistController', () => {
  const service = { markException: jest.fn() };
  const exportService = {};
  let controller: OffboardingChecklistController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OffboardingChecklistController(
      service as never,
      exportService as never,
    );
  });

  const sessionContext: AuthContextType = {
    authType: 'session',
    userId: 'usr_1',
    userEmail: 'user@example.com',
    organizationId: 'org_1',
    memberId: 'mem_1',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: null,
  };

  describe('markException', () => {
    it('delegates to the service with the acting user and reason', async () => {
      service.markException.mockResolvedValue({ id: 'occ_1' });

      const result = await controller.markException(
        'org_1',
        sessionContext,
        'mem_1',
        'oct_1',
        { reason: 'No company device was ever issued' },
      );

      expect(service.markException).toHaveBeenCalledWith({
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        completedById: 'usr_1',
        reason: 'No company device was ever issued',
      });
      expect(result).toEqual({ id: 'occ_1' });
    });

    it('rejects when there is no user context', async () => {
      const apiKeyContext: AuthContextType = {
        authType: 'api-key',
        organizationId: 'org_1',
        isApiKey: true,
        isPlatformAdmin: false,
        userRoles: null,
      };

      await expect(
        controller.markException('org_1', apiKeyContext, 'mem_1', 'oct_1', {
          reason: 'No device',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(service.markException).not.toHaveBeenCalled();
    });
  });
});
