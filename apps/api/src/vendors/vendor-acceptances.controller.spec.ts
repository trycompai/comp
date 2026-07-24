import { Test, TestingModule } from '@nestjs/testing';
import type { AuthContext } from '../auth/types';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { VendorAcceptancesController } from './vendor-acceptances.controller';
import { RiskAcceptancesService } from '../risks/risk-acceptances.service';

jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { vendor: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('VendorAcceptancesController', () => {
  let controller: VendorAcceptancesController;
  let acceptancesService: {
    listForVendor: jest.Mock;
    createForVendor: jest.Mock;
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
    acceptedByName: 'John Smith',
    notes: null,
    residualLikelihood: 'possible',
    residualImpact: 'moderate',
    level: 'low',
    levelLabel: 'Low',
    stale: false,
    createdAt: new Date('2026-04-15T00:00:00Z'),
  };

  beforeEach(async () => {
    acceptancesService = {
      listForVendor: jest.fn(),
      createForVendor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorAcceptancesController],
      providers: [
        { provide: RiskAcceptancesService, useValue: acceptancesService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(VendorAcceptancesController);
    jest.clearAllMocks();
  });

  it('lists vendor acceptance events with auth info', async () => {
    acceptancesService.listForVendor.mockResolvedValue({
      vendor: { assigneeId: 'mem_123' },
      acceptances: [acceptanceView],
    });

    const result = await controller.listVendorAcceptances(
      'vnd_1',
      orgId,
      authContext,
    );

    expect(acceptancesService.listForVendor).toHaveBeenCalledWith(
      'vnd_1',
      orgId,
    );
    expect(result.data).toEqual([acceptanceView]);
    expect(result.authType).toBe('session');
  });

  it('records a vendor acceptance and returns the created event', async () => {
    acceptancesService.createForVendor.mockResolvedValue(acceptanceView);

    const result = await controller.recordVendorAcceptance(
      'vnd_1',
      { acceptedById: 'mem_123' },
      orgId,
      authContext,
    );

    expect(acceptancesService.createForVendor).toHaveBeenCalledWith(
      'vnd_1',
      orgId,
      { acceptedById: 'mem_123' },
    );
    expect(result.id).toBe('rska_1');
  });
});
