import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';

// Mock the database
jest.mock('@trycompai/db', () => ({
  db: {
    organizationRole: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    member: {
      count: jest.fn(),
    },
  },
}));

import { db } from '@trycompai/db';

describe('RolesService', () => {
  let service: RolesService;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService],
    }).compile();

    service = module.get<RolesService>(RolesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    const organizationId = 'org_123';
    const validDto = {
      name: 'compliance-lead',
      permissions: {
        control: ['read', 'update'],
        policy: ['read'],
      },
    };

    it('should create a new custom role', async () => {
      const mockRole = {
        id: 'rol_123',
        name: validDto.name,
        permissions: validDto.permissions,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organizationRole.count as jest.Mock).mockResolvedValue(0);
      (mockDb.organizationRole.create as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.createRole(organizationId, validDto, ['owner']);

      expect(result).toEqual(mockRole);
      expect(mockDb.organizationRole.create).toHaveBeenCalledWith({
        data: {
          name: validDto.name,
          permissions: validDto.permissions,
          organizationId,
        },
      });
    });

    it('should reject built-in role names', async () => {
      const dto = { name: 'owner', permissions: { control: ['read'] } };

      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        'Cannot create role with reserved name: owner',
      );
    });

    it('should reject invalid resource names', async () => {
      const dto = {
        name: 'test-role',
        permissions: { invalidResource: ['read'] },
      };

      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        'Invalid resource: invalidResource',
      );
    });

    it('should reject invalid actions for valid resources', async () => {
      const dto = {
        name: 'test-role',
        permissions: { control: ['read', 'invalidAction'] },
      };

      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRole(organizationId, dto, ['owner'])).rejects.toThrow(
        "Invalid action 'invalidAction' for resource 'control'",
      );
    });

    it('should reject duplicate role names', async () => {
      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'rol_existing',
        name: validDto.name,
      });

      await expect(service.createRole(organizationId, validDto, ['owner'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRole(organizationId, validDto, ['owner'])).rejects.toThrow(
        `Role '${validDto.name}' already exists`,
      );
    });

    it('should enforce maximum 20 roles per organization', async () => {
      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organizationRole.count as jest.Mock).mockResolvedValue(20);

      await expect(service.createRole(organizationId, validDto, ['owner'])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createRole(organizationId, validDto, ['owner'])).rejects.toThrow(
        'Maximum of 20 custom roles per organization',
      );
    });

    it('should prevent privilege escalation - cannot grant permissions you do not have', async () => {
      // Employee trying to grant admin-level permissions
      const dto = {
        name: 'super-role',
        permissions: {
          organization: ['delete'], // Employee doesn't have this
        },
      };

      await expect(service.createRole(organizationId, dto, ['employee'])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow owners to grant organization:delete', async () => {
      const dto = {
        name: 'delete-role',
        permissions: {
          organization: ['read', 'delete'],
        },
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organizationRole.count as jest.Mock).mockResolvedValue(0);
      (mockDb.organizationRole.create as jest.Mock).mockResolvedValue({
        id: 'rol_123',
        ...dto,
        organizationId,
      });

      // Should not throw for owner
      await expect(service.createRole(organizationId, dto, ['owner'])).resolves.toBeDefined();
    });

    it('should prevent non-owners from granting organization:delete', async () => {
      const dto = {
        name: 'delete-role',
        permissions: {
          organization: ['read', 'delete'],
        },
      };

      // Admin doesn't have organization:delete permission, so privilege escalation check fails first
      await expect(service.createRole(organizationId, dto, ['admin'])).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createRole(organizationId, dto, ['admin'])).rejects.toThrow(
        "Cannot grant 'organization:delete' permission - you don't have this permission",
      );
    });

    it('should combine permissions from multiple roles for privilege check', async () => {
      // User has both employee and auditor roles
      // Employee has: task, evidence, policy, questionnaire, portal
      // Auditor has: organization, member, invitation, control, evidence, policy, risk, vendor, task, framework, audit, finding, questionnaire, integration, app, portal
      const dto = {
        name: 'combined-role',
        permissions: {
          finding: ['create', 'read'], // Auditor has this, employee doesn't
          task: ['read', 'complete'], // Employee has this
        },
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organizationRole.count as jest.Mock).mockResolvedValue(0);
      (mockDb.organizationRole.create as jest.Mock).mockResolvedValue({
        id: 'rol_123',
        ...dto,
        organizationId,
      });

      // Should succeed because combined permissions include both
      await expect(
        service.createRole(organizationId, dto, ['employee', 'auditor']),
      ).resolves.toBeDefined();
    });
  });

  describe('listRoles', () => {
    it('should return both built-in and custom roles', async () => {
      const customRoles = [
        {
          id: 'rol_1',
          name: 'custom-role-1',
          permissions: { control: ['read'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockDb.organizationRole.findMany as jest.Mock).mockResolvedValue(customRoles);

      const result = await service.listRoles('org_123');

      expect(result.builtInRoles).toHaveLength(5); // owner, admin, auditor, employee, contractor
      expect(result.builtInRoles.map((r) => r.name)).toEqual([
        'owner',
        'admin',
        'auditor',
        'employee',
        'contractor',
      ]);
      expect(result.customRoles).toHaveLength(1);
      expect(result.customRoles[0].isBuiltIn).toBe(false);
    });
  });

  describe('getRole', () => {
    it('should return a role by ID', async () => {
      const mockRole = {
        id: 'rol_123',
        name: 'custom-role',
        permissions: { control: ['read'] },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.getRole('org_123', 'rol_123');

      expect(result.id).toBe('rol_123');
      expect(result.isBuiltIn).toBe(false);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getRole('org_123', 'rol_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    const organizationId = 'org_123';
    const roleId = 'rol_123';

    it('should update role name', async () => {
      const existingRole = {
        id: roleId,
        name: 'old-name',
        permissions: { control: ['read'] },
      };

      (mockDb.organizationRole.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingRole) // First call: find role to update
        .mockResolvedValueOnce(null); // Second call: check name uniqueness

      (mockDb.organizationRole.update as jest.Mock).mockResolvedValue({
        ...existingRole,
        name: 'new-name',
        updatedAt: new Date(),
      });

      const result = await service.updateRole(
        organizationId,
        roleId,
        { name: 'new-name' },
        ['owner'],
      );

      expect(result.name).toBe('new-name');
    });

    it('should reject reserved names on update', async () => {
      const existingRole = {
        id: roleId,
        name: 'old-name',
        permissions: { control: ['read'] },
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(existingRole);

      await expect(
        service.updateRole(organizationId, roleId, { name: 'admin' }, ['owner']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRole(organizationId, roleId, { name: 'new-name' }, ['owner']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRole', () => {
    const organizationId = 'org_123';
    const roleId = 'rol_123';

    it('should delete a role with no assigned members', async () => {
      const existingRole = {
        id: roleId,
        name: 'custom-role',
        permissions: { control: ['read'] },
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(existingRole);
      (mockDb.member.count as jest.Mock).mockResolvedValue(0);
      (mockDb.organizationRole.delete as jest.Mock).mockResolvedValue(existingRole);

      const result = await service.deleteRole(organizationId, roleId);

      expect(result.success).toBe(true);
      expect(mockDb.organizationRole.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('should reject deletion when members are assigned', async () => {
      const existingRole = {
        id: roleId,
        name: 'custom-role',
        permissions: { control: ['read'] },
      };

      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(existingRole);
      (mockDb.member.count as jest.Mock).mockResolvedValue(3);

      await expect(service.deleteRole(organizationId, roleId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteRole(organizationId, roleId)).rejects.toThrow(
        '3 member(s) are assigned to it',
      );
    });

    it('should throw NotFoundException for non-existent role', async () => {
      (mockDb.organizationRole.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRole(organizationId, roleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
