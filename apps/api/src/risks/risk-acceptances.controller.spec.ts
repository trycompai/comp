import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '../auth/types';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RiskAcceptancesController } from './risk-acceptances.controller';
import { RiskAcceptancesService } from './risk-acceptances.service';

jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { risk: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('../utils/assignment-filter', () => ({
  hasRiskAccess: jest.fn().mockReturnValue(true),
}));

import { hasRiskAccess } from '../utils/assignment-filter';

const mockHasRiskAccess = hasRiskAccess as jest.MockedFunction<
  typeof hasRiskAccess
>;

describe('RiskAcceptancesController', () => {
  let controller: RiskAcceptancesController;
  let acceptancesService: {
    listForRisk: jest.Mock;
    createForRisk: jest.Mock;
  };

  const orgId = 'org_test123';

  const authContext: AuthContext = {
    organizationId: orgId,
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: ['admin'],
    userId: 'usr_123',
    userEmail: 'admin@example.com',
    memberId: 'mem_123',
  };

  const acceptanceView = {
    id: 'rska_1',
    acceptedById: 'mem_123',
    acceptedByName: 'Jane Doe',
    notes: null,
    residualLikelihood: 'unlikely',
    residualImpact: 'minor',
    level: 'very-low',
    levelLabel: 'Very low',
    stale: false,
    createdAt: new Date('2026-04-15T00:00:00Z'),
  };

  beforeEach(async () => {
    acceptancesService = {
      listForRisk: jest.fn(),
      createForRisk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskAcceptancesController],
      providers: [
        { provide: RiskAcceptancesService, useValue: acceptancesService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RiskAcceptancesController);
    jest.clearAllMocks();
    mockHasRiskAccess.mockReturnValue(true);
  });

  describe('listRiskAcceptances', () => {
    it('lists acceptance events with auth info', async () => {
      acceptancesService.listForRisk.mockResolvedValue({
        risk: { id: 'risk_1', assigneeId: 'mem_123' },
        acceptances: [acceptanceView],
      });

      const result = await controller.listRiskAcceptances(
        'risk_1',
        orgId,
        authContext,
      );

      expect(acceptancesService.listForRisk).toHaveBeenCalledWith(
        'risk_1',
        orgId,
      );
      expect(result.data).toEqual([acceptanceView]);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'admin@example.com',
      });
    });

    it('denies the list to restricted roles without assignment access', async () => {
      acceptancesService.listForRisk.mockResolvedValue({
        risk: { id: 'risk_1', assigneeId: 'mem_other' },
        acceptances: [],
      });
      mockHasRiskAccess.mockReturnValue(false);

      await expect(
        controller.listRiskAcceptances('risk_1', orgId, authContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recordRiskAcceptance', () => {
    it('records an acceptance and returns the created event', async () => {
      acceptancesService.createForRisk.mockResolvedValue(acceptanceView);

      const result = await controller.recordRiskAcceptance(
        'risk_1',
        { notes: 'Reviewed at Q2' },
        orgId,
        authContext,
      );

      expect(acceptancesService.createForRisk).toHaveBeenCalledWith(
        'risk_1',
        orgId,
        { notes: 'Reviewed at Q2' },
        expect.any(Function),
      );
      expect(result.id).toBe('rska_1');
      expect(result.authType).toBe('session');
    });

    it('passes an access gate that rejects restricted roles without assignment', async () => {
      acceptancesService.createForRisk.mockImplementation(
        async (_riskId, _orgId, _dto, assertAccess) => {
          // Simulate the service invoking the gate with the loaded risk.
          assertAccess?.({ assigneeId: 'mem_other' });
          return acceptanceView;
        },
      );
      mockHasRiskAccess.mockReturnValue(false);

      await expect(
        controller.recordRiskAcceptance('risk_1', {}, orgId, authContext),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
