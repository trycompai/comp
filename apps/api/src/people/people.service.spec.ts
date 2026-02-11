import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PeopleService } from './people.service';
import { FleetService } from '../lib/fleet.service';
import { MemberValidator } from './utils/member-validator';
import { MemberQueries } from './utils/member-queries';

// Mock the database
jest.mock('@trycompai/db', () => ({
  db: {
    member: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    policy: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    risk: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    vendor: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      deleteMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: jest.fn().mockResolvedValue(false),
  sendUnassignedItemsNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./utils/member-validator');
jest.mock('./utils/member-queries');

import { db } from '@trycompai/db';

describe('PeopleService', () => {
  let service: PeopleService;
  let fleetService: jest.Mocked<FleetService>;

  const mockFleetService = {
    removeHostsByLabel: jest.fn(),
    getHostsByLabel: jest.fn(),
    removeHostById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: FleetService, useValue: mockFleetService },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
    fleetService = module.get(FleetService);

    jest.clearAllMocks();
  });

  describe('findAllByOrganization', () => {
    it('should return all members for an organization', async () => {
      const mockMembers = [
        { id: 'mem_1', user: { name: 'Alice' } },
        { id: 'mem_2', user: { name: 'Bob' } },
      ];

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findAllByOrganization as jest.Mock).mockResolvedValue(
        mockMembers,
      );

      const result = await service.findAllByOrganization('org_123');

      expect(result).toEqual(mockMembers);
      expect(result).toHaveLength(2);
      expect(MemberValidator.validateOrganization).toHaveBeenCalledWith(
        'org_123',
      );
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      (MemberValidator.validateOrganization as jest.Mock).mockRejectedValue(
        new NotFoundException('Organization not found'),
      );

      await expect(
        service.findAllByOrganization('org_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return a member by ID', async () => {
      const mockMember = {
        id: 'mem_1',
        user: { name: 'Alice', email: 'alice@test.com' },
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        mockMember,
      );

      const result = await service.findById('mem_1', 'org_123');

      expect(result).toEqual(mockMember);
      expect(MemberQueries.findByIdInOrganization).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findById('mem_none', 'org_123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new member', async () => {
      const createData = {
        userId: 'usr_new',
        role: 'employee',
        department: 'engineering',
      };
      const createdMember = {
        id: 'mem_new',
        user: { name: 'NewUser' },
        role: 'employee',
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateUser as jest.Mock).mockResolvedValue(undefined);
      (MemberValidator.validateUserNotMember as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.createMember as jest.Mock).mockResolvedValue(
        createdMember,
      );

      const result = await service.create('org_123', createData as any);

      expect(result).toEqual(createdMember);
      expect(MemberQueries.createMember).toHaveBeenCalledWith(
        'org_123',
        createData,
      );
    });

    it('should throw when user is already a member', async () => {
      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateUser as jest.Mock).mockResolvedValue(undefined);
      (MemberValidator.validateUserNotMember as jest.Mock).mockRejectedValue(
        new BadRequestException('User is already a member'),
      );

      await expect(
        service.create('org_123', { userId: 'usr_dup' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateById', () => {
    it('should update a member', async () => {
      const updateData = { role: 'admin' };
      const existingMember = {
        id: 'mem_1',
        userId: 'usr_1',
        role: 'employee',
      };
      const updatedMember = { id: 'mem_1', user: { name: 'Alice' }, role: 'admin' };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
        existingMember,
      );
      (MemberQueries.updateMember as jest.Mock).mockResolvedValue(
        updatedMember,
      );

      const result = await service.updateById(
        'mem_1',
        'org_123',
        updateData as any,
      );

      expect(result).toEqual(updatedMember);
      expect(MemberQueries.updateMember).toHaveBeenCalledWith(
        'mem_1',
        updateData,
      );
    });

    it('should validate new userId when changing user', async () => {
      const updateData = { userId: 'usr_new' };
      const existingMember = {
        id: 'mem_1',
        userId: 'usr_old',
        role: 'employee',
      };
      const updatedMember = { id: 'mem_1', user: { name: 'New' }, role: 'employee' };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
        existingMember,
      );
      (MemberValidator.validateUser as jest.Mock).mockResolvedValue(undefined);
      (MemberValidator.validateUserNotMember as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.updateMember as jest.Mock).mockResolvedValue(
        updatedMember,
      );

      await service.updateById('mem_1', 'org_123', updateData as any);

      expect(MemberValidator.validateUser).toHaveBeenCalledWith('usr_new');
      expect(MemberValidator.validateUserNotMember).toHaveBeenCalledWith(
        'usr_new',
        'org_123',
        'mem_1',
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateMemberExists as jest.Mock).mockRejectedValue(
        new NotFoundException('Member not found'),
      );

      await expect(
        service.updateById('mem_none', 'org_123', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteById', () => {
    const mockMember = {
      id: 'mem_1',
      userId: 'usr_1',
      role: 'employee',
      fleetDmLabelId: null,
      user: {
        id: 'usr_1',
        name: 'Alice',
        email: 'alice@test.com',
        isPlatformAdmin: false,
      },
    };

    beforeEach(() => {
      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      // Mock empty assignments
      (db.task.findMany as jest.Mock).mockResolvedValue([]);
      (db.policy.findMany as jest.Mock).mockResolvedValue([]);
      (db.risk.findMany as jest.Mock).mockResolvedValue([]);
      (db.vendor.findMany as jest.Mock).mockResolvedValue([]);
      (db.task.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (db.policy.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (db.risk.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (db.vendor.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (db.member.update as jest.Mock).mockResolvedValue({});
      (db.session.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (db.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    });

    it('should deactivate a member successfully', async () => {
      const result = await service.deleteById('mem_1', 'org_123', 'usr_actor');

      expect(result.success).toBe(true);
      expect(result.deletedMember.id).toBe('mem_1');
      expect(db.member.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { deactivated: true, isActive: false },
      });
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
      });
    });

    it('should throw ForbiddenException when deleting an owner', async () => {
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        ...mockMember,
        role: 'owner',
      });

      await expect(
        service.deleteById('mem_1', 'org_123', 'usr_actor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when deleting a platform admin', async () => {
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        ...mockMember,
        user: { ...mockMember.user, isPlatformAdmin: true },
      });

      await expect(
        service.deleteById('mem_1', 'org_123', 'usr_actor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when deleting yourself', async () => {
      await expect(
        service.deleteById('mem_1', 'org_123', 'usr_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when member does not exist', async () => {
      (db.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteById('mem_none', 'org_123', 'usr_actor'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clear assignments and notify owner', async () => {
      const tasks = [{ id: 't1', title: 'Task 1' }];
      const policies = [{ id: 'p1', name: 'Policy 1' }];
      (db.task.findMany as jest.Mock).mockResolvedValue(tasks);
      (db.policy.findMany as jest.Mock).mockResolvedValue(policies);

      await service.deleteById('mem_1', 'org_123', 'usr_actor');

      expect(db.task.updateMany).toHaveBeenCalledWith({
        where: { assigneeId: 'mem_1', organizationId: 'org_123' },
        data: { assigneeId: null },
      });
      expect(db.policy.updateMany).toHaveBeenCalledWith({
        where: { assigneeId: 'mem_1', organizationId: 'org_123' },
        data: { assigneeId: null },
      });
    });

    it('should remove fleet hosts when fleetDmLabelId exists', async () => {
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        ...mockMember,
        fleetDmLabelId: 42,
      });
      mockFleetService.removeHostsByLabel.mockResolvedValue({
        deletedCount: 2,
        failedCount: 0,
      });

      await service.deleteById('mem_1', 'org_123', 'usr_actor');

      expect(fleetService.removeHostsByLabel).toHaveBeenCalledWith(42);
    });
  });

  describe('unlinkDevice', () => {
    it('should unlink a device from a member', async () => {
      const member = {
        id: 'mem_1',
        fleetDmLabelId: 42,
        user: { name: 'Alice' },
      };
      const unlinked = {
        id: 'mem_1',
        fleetDmLabelId: null,
        user: { name: 'Alice' },
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        member,
      );
      (MemberQueries.unlinkDevice as jest.Mock).mockResolvedValue(unlinked);
      mockFleetService.removeHostsByLabel.mockResolvedValue({
        deletedCount: 1,
        failedCount: 0,
      });

      const result = await service.unlinkDevice('mem_1', 'org_123');

      expect(result.fleetDmLabelId).toBeNull();
      expect(fleetService.removeHostsByLabel).toHaveBeenCalledWith(42);
    });

    it('should skip fleet removal when no label exists', async () => {
      const member = {
        id: 'mem_1',
        fleetDmLabelId: null,
        user: { name: 'Alice' },
      };
      const unlinked = { ...member };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        member,
      );
      (MemberQueries.unlinkDevice as jest.Mock).mockResolvedValue(unlinked);

      await service.unlinkDevice('mem_1', 'org_123');

      expect(fleetService.removeHostsByLabel).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when member not found', async () => {
      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.unlinkDevice('mem_none', 'org_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeHostById', () => {
    it('should remove a specific host', async () => {
      const member = {
        id: 'mem_1',
        fleetDmLabelId: 42,
        user: { name: 'Alice' },
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        member,
      );
      mockFleetService.getHostsByLabel.mockResolvedValue({
        hosts: [{ id: 100 }, { id: 200 }],
      });
      mockFleetService.removeHostById.mockResolvedValue(undefined);

      const result = await service.removeHostById('mem_1', 'org_123', 100);

      expect(result).toEqual({ success: true });
      expect(fleetService.removeHostById).toHaveBeenCalledWith(100);
    });

    it('should throw NotFoundException when host not found for member', async () => {
      const member = {
        id: 'mem_1',
        fleetDmLabelId: 42,
        user: { name: 'Alice' },
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        member,
      );
      mockFleetService.getHostsByLabel.mockResolvedValue({
        hosts: [{ id: 100 }],
      });

      await expect(
        service.removeHostById('mem_1', 'org_123', 999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when member has no fleet label', async () => {
      const member = {
        id: 'mem_1',
        fleetDmLabelId: null,
        user: { name: 'Alice' },
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
        member,
      );

      await expect(
        service.removeHostById('mem_1', 'org_123', 100),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEmailPreferences', () => {
    it('should update preferences and set unsubscribed to false when any enabled', async () => {
      const prefs = {
        policyNotifications: true,
        taskReminders: false,
        weeklyTaskDigest: true,
        unassignedItemsNotifications: false,
        taskMentions: true,
        taskAssignments: true,
      };

      (db.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateEmailPreferences('usr_1', prefs);

      expect(result).toEqual({ success: true });
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: {
          emailPreferences: prefs,
          emailNotificationsUnsubscribed: false,
        },
      });
    });

    it('should set unsubscribed to true when all preferences disabled', async () => {
      const prefs = {
        policyNotifications: false,
        taskReminders: false,
        weeklyTaskDigest: false,
        unassignedItemsNotifications: false,
        taskMentions: false,
        taskAssignments: false,
      };

      (db.user.update as jest.Mock).mockResolvedValue({});

      await service.updateEmailPreferences('usr_1', prefs);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: {
          emailPreferences: prefs,
          emailNotificationsUnsubscribed: true,
        },
      });
    });
  });
});
