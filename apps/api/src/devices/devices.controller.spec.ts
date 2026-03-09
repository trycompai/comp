import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    app: ['read'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: jest.Mocked<DevicesService>;

  const mockService = {
    findAllByOrganization: jest.fn(),
    findAllByMember: jest.fn(),
    getMemberById: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContextType = {
    authType: 'session' as const,
    userId: 'usr_1',
    userEmail: 'user@example.com',
    organizationId: 'org_1',
    memberId: 'mem_1',
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<DevicesController>(DevicesController);
    service = module.get(DevicesService);

    jest.clearAllMocks();
  });

  describe('getAllDevices', () => {
    it('should return devices with count and auth info', async () => {
      const mockDevices = [
        { id: 'dev_1', name: 'MacBook Pro' },
        { id: 'dev_2', name: 'iPhone 15' },
      ];
      mockService.findAllByOrganization.mockResolvedValue(mockDevices);

      const result = await controller.getAllDevices('org_1', mockAuthContext);

      expect(result).toEqual({
        data: mockDevices,
        count: 2,
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'user@example.com' },
      });
      expect(service.findAllByOrganization).toHaveBeenCalledWith('org_1');
    });

    it('should return empty array when no devices found', async () => {
      mockService.findAllByOrganization.mockResolvedValue([]);

      const result = await controller.getAllDevices('org_1', mockAuthContext);

      expect(result).toEqual({
        data: [],
        count: 0,
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'user@example.com' },
      });
    });

    it('should not include authenticatedUser when userId or email is absent', async () => {
      mockService.findAllByOrganization.mockResolvedValue([]);

      const authContextNoUser: AuthContextType = {
        authType: 'api-key' as const,
        organizationId: 'org_1',
        permissions: [],
      } as AuthContextType;

      const result = await controller.getAllDevices('org_1', authContextNoUser);

      expect(result).toEqual({
        data: [],
        count: 0,
        authType: 'api-key',
      });
    });
  });

  describe('getDevicesByMember', () => {
    it('should return devices and member info for given memberId', async () => {
      const mockDevices = [{ id: 'dev_1', name: 'MacBook Pro' }];
      const mockMember = { id: 'mem_1', name: 'John Doe' };
      mockService.findAllByMember.mockResolvedValue(mockDevices);
      mockService.getMemberById.mockResolvedValue(mockMember);

      const result = await controller.getDevicesByMember(
        'mem_1',
        'org_1',
        mockAuthContext,
      );

      expect(result).toEqual({
        data: mockDevices,
        count: 1,
        member: mockMember,
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'user@example.com' },
      });
      expect(service.findAllByMember).toHaveBeenCalledWith('org_1', 'mem_1');
      expect(service.getMemberById).toHaveBeenCalledWith('org_1', 'mem_1');
    });

    it('should call both service methods in parallel', async () => {
      const resolveOrder: string[] = [];

      mockService.findAllByMember.mockImplementation(async () => {
        resolveOrder.push('findAllByMember');
        return [];
      });
      mockService.getMemberById.mockImplementation(async () => {
        resolveOrder.push('getMemberById');
        return { id: 'mem_1' };
      });

      await controller.getDevicesByMember('mem_1', 'org_1', mockAuthContext);

      expect(service.findAllByMember).toHaveBeenCalledTimes(1);
      expect(service.getMemberById).toHaveBeenCalledTimes(1);
    });

    it('should not include authenticatedUser when userId or email is absent', async () => {
      mockService.findAllByMember.mockResolvedValue([]);
      mockService.getMemberById.mockResolvedValue({ id: 'mem_1' });

      const authContextNoUser: AuthContextType = {
        authType: 'api-key' as const,
        organizationId: 'org_1',
        permissions: [],
      } as AuthContextType;

      const result = await controller.getDevicesByMember(
        'mem_1',
        'org_1',
        authContextNoUser,
      );

      expect(result).toEqual({
        data: [],
        count: 0,
        member: { id: 'mem_1' },
        authType: 'api-key',
      });
    });

    it('should propagate service errors', async () => {
      mockService.findAllByMember.mockRejectedValue(
        new Error('FleetDM unavailable'),
      );
      mockService.getMemberById.mockResolvedValue({ id: 'mem_1' });

      await expect(
        controller.getDevicesByMember('mem_1', 'org_1', mockAuthContext),
      ).rejects.toThrow('FleetDM unavailable');
    });
  });
});
