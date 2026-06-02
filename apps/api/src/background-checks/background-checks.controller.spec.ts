import { Test, TestingModule } from '@nestjs/testing';
import {
  PeopleBackgroundChecksController,
} from './background-checks.controller';
import { BackgroundChecksService } from './background-checks.service';
import { BackgroundCheckCustomService } from './background-check-custom.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { member: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@db', () => ({ db: {}, Prisma: {} }));

describe('PeopleBackgroundChecksController admin actions', () => {
  let controller: PeopleBackgroundChecksController;

  const service = {
    retryForMember: jest.fn(),
    cancelForMember: jest.fn(),
    deleteForMember: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const authContext: AuthContextType = {
    authType: 'session',
    userId: 'usr_1',
    userEmail: 'user@example.com',
    organizationId: 'org_1',
    memberId: 'mem_admin',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleBackgroundChecksController],
      providers: [
        { provide: BackgroundChecksService, useValue: service },
        { provide: BackgroundCheckCustomService, useValue: {} },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(PeopleBackgroundChecksController);
    jest.clearAllMocks();
  });

  it('delegates retry with the requester email', async () => {
    await controller.retryForMember('mem_1', 'org_1', authContext);
    expect(service.retryForMember).toHaveBeenCalledWith({
      organizationId: 'org_1',
      memberId: 'mem_1',
      requesterEmail: 'user@example.com',
    });
  });

  it('delegates cancel', async () => {
    await controller.cancelForMember('mem_1', 'org_1');
    expect(service.cancelForMember).toHaveBeenCalledWith({
      organizationId: 'org_1',
      memberId: 'mem_1',
    });
  });

  it('delegates delete', async () => {
    await controller.deleteForMember('mem_1', 'org_1');
    expect(service.deleteForMember).toHaveBeenCalledWith({
      organizationId: 'org_1',
      memberId: 'mem_1',
    });
  });
});
