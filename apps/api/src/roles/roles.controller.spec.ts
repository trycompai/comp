import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import type { AuthContext } from '../auth/types';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

import { RolesController } from './roles.controller';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: jest.Mocked<RolesService>;

  const mockRolesService = {
    createRole: jest.fn(),
    listRoles: jest.fn(),
    getRole: jest.fn(),
    updateRole: jest.fn(),
    deleteRole: jest.fn(),
  };

  // Mock guards that allow all requests
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['owner'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);

    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a role with user roles', async () => {
      const dto = {
        name: 'custom-role',
        permissions: { control: ['read'] },
      };
      const expectedRole = {
        id: 'rol_123',
        ...dto,
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRolesService.createRole.mockResolvedValue(expectedRole);

      const result = await controller.createRole('org_123', mockAuthContext, dto);

      expect(result).toEqual(expectedRole);
      expect(rolesService.createRole).toHaveBeenCalledWith('org_123', dto, ['owner']);
    });

    it('should pass multiple roles to service', async () => {
      const multiRoleContext: AuthContext = {
        ...mockAuthContext,
        userRoles: ['admin', 'auditor'],
      };
      const dto = {
        name: 'custom-role',
        permissions: { control: ['read'] },
      };

      mockRolesService.createRole.mockResolvedValue({ id: 'rol_123' });

      await controller.createRole('org_123', multiRoleContext, dto);

      expect(rolesService.createRole).toHaveBeenCalledWith('org_123', dto, [
        'admin',
        'auditor',
      ]);
    });

    it('should default to employee role when userRoles is null', async () => {
      const noRoleContext: AuthContext = {
        ...mockAuthContext,
        userRoles: null,
      };
      const dto = {
        name: 'custom-role',
        permissions: { control: ['read'] },
      };

      mockRolesService.createRole.mockResolvedValue({ id: 'rol_123' });

      await controller.createRole('org_123', noRoleContext, dto);

      expect(rolesService.createRole).toHaveBeenCalledWith('org_123', dto, ['employee']);
    });
  });

  describe('listRoles', () => {
    it('should return list of roles', async () => {
      const expectedResult = {
        builtInRoles: [
          { name: 'owner', isBuiltIn: true, description: 'Full access' },
        ],
        customRoles: [{ id: 'rol_123', name: 'custom', isBuiltIn: false }],
      };

      mockRolesService.listRoles.mockResolvedValue(expectedResult);

      const result = await controller.listRoles('org_123');

      expect(result).toEqual(expectedResult);
      expect(rolesService.listRoles).toHaveBeenCalledWith('org_123');
    });
  });

  describe('getRole', () => {
    it('should return a single role', async () => {
      const expectedRole = {
        id: 'rol_123',
        name: 'custom-role',
        permissions: { control: ['read'] },
        isBuiltIn: false,
      };

      mockRolesService.getRole.mockResolvedValue(expectedRole);

      const result = await controller.getRole('org_123', 'rol_123');

      expect(result).toEqual(expectedRole);
      expect(rolesService.getRole).toHaveBeenCalledWith('org_123', 'rol_123');
    });
  });

  describe('updateRole', () => {
    it('should update a role with user roles', async () => {
      const dto = { name: 'updated-name' };
      const expectedRole = {
        id: 'rol_123',
        name: 'updated-name',
        permissions: { control: ['read'] },
        isBuiltIn: false,
      };

      mockRolesService.updateRole.mockResolvedValue(expectedRole);

      const result = await controller.updateRole(
        'org_123',
        mockAuthContext,
        'rol_123',
        dto,
      );

      expect(result).toEqual(expectedRole);
      expect(rolesService.updateRole).toHaveBeenCalledWith(
        'org_123',
        'rol_123',
        dto,
        ['owner'],
      );
    });

    it('should pass multiple roles to service on update', async () => {
      const multiRoleContext: AuthContext = {
        ...mockAuthContext,
        userRoles: ['owner', 'admin'],
      };
      const dto = { permissions: { control: ['read', 'update'] } };

      mockRolesService.updateRole.mockResolvedValue({ id: 'rol_123' });

      await controller.updateRole('org_123', multiRoleContext, 'rol_123', dto);

      expect(rolesService.updateRole).toHaveBeenCalledWith('org_123', 'rol_123', dto, [
        'owner',
        'admin',
      ]);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const expectedResult = { success: true, message: "Role 'custom-role' deleted" };

      mockRolesService.deleteRole.mockResolvedValue(expectedResult);

      const result = await controller.deleteRole('org_123', 'rol_123');

      expect(result).toEqual(expectedResult);
      expect(rolesService.deleteRole).toHaveBeenCalledWith('org_123', 'rol_123');
    });
  });
});
