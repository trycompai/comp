import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import type { AuthContext } from '../auth/types';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PeopleController } from './people.controller';
import { BadRequestException } from '@nestjs/common';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

describe('PeopleController', () => {
  let controller: PeopleController;
  let peopleService: jest.Mocked<PeopleService>;

  const mockPeopleService = {
    findAllByOrganization: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    unlinkDevice: jest.fn(),
    removeHostById: jest.fn(),
    updateEmailPreferences: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['owner'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleController],
      providers: [{ provide: PeopleService, useValue: mockPeopleService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PeopleController>(PeopleController);
    peopleService = module.get(PeopleService);

    jest.clearAllMocks();
  });

  describe('getAllPeople', () => {
    it('should return people with auth context', async () => {
      const mockPeople = [
        { id: 'mem_1', user: { name: 'Alice' } },
        { id: 'mem_2', user: { name: 'Bob' } },
      ];

      mockPeopleService.findAllByOrganization.mockResolvedValue(mockPeople);

      const result = await controller.getAllPeople('org_123', mockAuthContext);

      expect(result.data).toEqual(mockPeople);
      expect(result.count).toBe(2);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(peopleService.findAllByOrganization).toHaveBeenCalledWith(
        'org_123',
        false,
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const apiKeyContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
        userEmail: undefined,
        authType: 'api-key',
        isApiKey: true,
      };
      mockPeopleService.findAllByOrganization.mockResolvedValue([]);

      const result = await controller.getAllPeople('org_123', apiKeyContext);

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
    });
  });

  describe('createMember', () => {
    it('should create a member and return with auth context', async () => {
      const dto = { userId: 'usr_new', role: 'employee' };
      const createdMember = {
        id: 'mem_new',
        user: { name: 'NewUser' },
        role: 'employee',
      };
      mockPeopleService.create.mockResolvedValue(createdMember);

      const result = await controller.createMember(
        dto as any,
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(createdMember);
      expect(result.authType).toBe('session');
      expect(peopleService.create).toHaveBeenCalledWith('org_123', dto);
    });
  });

  describe('bulkCreateMembers', () => {
    it('should bulk create and return summary', async () => {
      const dto = {
        members: [
          { userId: 'usr_1', role: 'employee' },
          { userId: 'usr_2', role: 'contractor' },
        ],
      };
      const bulkResult = {
        created: [{ id: 'mem_1' }],
        errors: [{ index: 1, userId: 'usr_2', error: 'Duplicate' }],
        summary: { total: 2, successful: 1, failed: 1 },
      };
      mockPeopleService.bulkCreate.mockResolvedValue(bulkResult);

      const result = await controller.bulkCreateMembers(
        dto as any,
        'org_123',
        mockAuthContext,
      );

      expect(result.summary).toEqual(bulkResult.summary);
      expect(peopleService.bulkCreate).toHaveBeenCalledWith('org_123', dto);
    });
  });

  describe('getPersonById', () => {
    it('should return a single person with auth context', async () => {
      const person = {
        id: 'mem_1',
        user: { name: 'Alice', email: 'alice@test.com' },
      };
      mockPeopleService.findById.mockResolvedValue(person);

      const result = await controller.getPersonById(
        'mem_1',
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(person);
      expect(result.authType).toBe('session');
      expect(peopleService.findById).toHaveBeenCalledWith('mem_1', 'org_123');
    });
  });

  describe('updateMember', () => {
    it('should update a member', async () => {
      const dto = { role: 'admin' };
      const updated = { id: 'mem_1', user: { name: 'Alice' }, role: 'admin' };
      mockPeopleService.updateById.mockResolvedValue(updated);

      const result = await controller.updateMember(
        'mem_1',
        dto as any,
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(updated);
      expect(peopleService.updateById).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
        dto,
      );
    });
  });

  describe('deleteMember', () => {
    it('should delete a member and pass actor userId', async () => {
      const deleteResult = {
        success: true,
        deletedMember: { id: 'mem_1', name: 'Alice', email: 'alice@test.com' },
      };
      mockPeopleService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteMember(
        'mem_1',
        'org_123',
        mockAuthContext,
      );

      expect(result.success).toBe(true);
      expect(peopleService.deleteById).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
        'usr_123',
      );
    });
  });

  describe('unlinkDevice', () => {
    it('should unlink device for a member', async () => {
      const updated = {
        id: 'mem_1',
        user: { name: 'Alice' },
        fleetDmLabelId: null,
      };
      mockPeopleService.unlinkDevice.mockResolvedValue(updated);

      const result = await controller.unlinkDevice(
        'mem_1',
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(updated);
      expect(peopleService.unlinkDevice).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
      );
    });
  });

  describe('removeHost', () => {
    it('should remove a host by ID', async () => {
      mockPeopleService.removeHostById.mockResolvedValue({ success: true });

      const result = await controller.removeHost(
        'mem_1',
        42,
        'org_123',
        mockAuthContext,
      );

      expect(result.success).toBe(true);
      expect(peopleService.removeHostById).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
        42,
      );
    });
  });

  describe('updateEmailPreferences', () => {
    it('should update email preferences for the current user', async () => {
      const prefs = {
        policyNotifications: true,
        taskReminders: false,
        weeklyTaskDigest: true,
        unassignedItemsNotifications: false,
        taskMentions: true,
        taskAssignments: true,
      };
      mockPeopleService.updateEmailPreferences.mockResolvedValue({
        success: true,
      });

      const result = await controller.updateEmailPreferences(mockAuthContext, {
        preferences: prefs,
      });

      expect(result).toEqual({ success: true });
      expect(peopleService.updateEmailPreferences).toHaveBeenCalledWith(
        'usr_123',
        prefs,
      );
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const noUserContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
      };

      await expect(
        controller.updateEmailPreferences(noUserContext, {
          preferences: {
            policyNotifications: true,
            taskReminders: true,
            weeklyTaskDigest: true,
            unassignedItemsNotifications: true,
            taskMentions: true,
            taskAssignments: true,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
