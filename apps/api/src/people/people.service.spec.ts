import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PeopleService } from './people.service';
import { FleetService } from '../lib/fleet.service';
import { TimelinesService } from '../timelines/timelines.service';
import { MemberValidator } from './utils/member-validator';
import { MemberQueries } from './utils/member-queries';

// Mock the database. Includes a stand-in Prisma.PrismaClientKnownRequestError
// so the service's `instanceof` error-code branches can be exercised.
jest.mock('@db', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
  },
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
    organizationChart: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
  BackgroundCheckStatus: {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
    cancelled: 'cancelled',
  },
  FindingType: { soc2: 'soc2', iso27001: 'iso27001' },
  FindingStatus: { open: 'open', closed: 'closed' },
  PhaseCompletionType: { manual: 'manual', auto: 'auto' },
  TimelinePhaseStatus: { pending: 'pending', completed: 'completed' },
  TimelineStatus: { draft: 'draft', active: 'active' },
  Departments: { it: 'it', none: 'none' },
}));

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: {
      organization: ['read', 'update', 'delete'],
      member: ['create', 'read', 'update', 'delete'],
    },
    admin: {
      organization: ['read', 'update'],
      member: ['create', 'read', 'update', 'delete'],
    },
    auditor: { organization: ['read'], member: ['read'] },
    employee: { compliance: ['required'] },
    contractor: { compliance: ['required'] },
  },
}));

jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: jest.fn().mockResolvedValue(false),
  sendUnassignedItemsNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./utils/member-validator');
jest.mock('./utils/member-queries');
jest.mock('./utils/login-email-change');

import { db, Prisma } from '@db';
import {
  notifyLoginEmailChanged,
  validateLoginEmailChange,
} from './utils/login-email-change';

describe('PeopleService', () => {
  let service: PeopleService;
  let fleetService: jest.Mocked<FleetService>;

  const mockFleetService = {
    removeHostsByLabel: jest.fn(),
    getHostsByLabel: jest.fn(),
    removeHostById: jest.fn(),
  };

  const mockTimelinesService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: FleetService, useValue: mockFleetService },
        { provide: TimelinesService, useValue: mockTimelinesService },
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
    const setupCallerMember = (
      callerUserId: string,
      organizationId: string,
      role: string,
    ) => {
      (db.member.findFirst as jest.Mock).mockImplementation(
        (args: { where: { userId?: string; organizationId?: string } }) => {
          if (
            args?.where?.userId === callerUserId &&
            args?.where?.organizationId === organizationId
          ) {
            return Promise.resolve({
              id: 'mem_caller',
              userId: callerUserId,
              organizationId,
              role,
            });
          }
          return Promise.resolve(null);
        },
      );
    };

    it('should update a member', async () => {
      const updateData = { role: 'auditor' };
      const existingMember = {
        id: 'mem_1',
        userId: 'usr_target',
        role: 'employee',
      };
      const updatedMember = {
        id: 'mem_1',
        user: { name: 'Alice' },
        role: 'auditor',
      };

      (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
        undefined,
      );
      (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
        existingMember,
      );
      (MemberQueries.updateMember as jest.Mock).mockResolvedValue(
        updatedMember,
      );
      setupCallerMember('usr_caller', 'org_123', 'admin,auditor');

      const result = await service.updateById(
        'mem_1',
        'org_123',
        updateData as any,
        'usr_caller',
      );

      expect(result).toEqual(updatedMember);
      expect(MemberQueries.updateMember).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
        updateData,
      );
    });

    describe('login email change', () => {
      const existingMember = {
        id: 'mem_1',
        userId: 'usr_target',
        role: 'employee',
      };
      const updatedMember = {
        id: 'mem_1',
        user: { name: 'Alice' },
        role: 'employee',
      };

      beforeEach(() => {
        (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
          undefined,
        );
        (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
          existingMember,
        );
        (MemberQueries.updateMember as jest.Mock).mockResolvedValue(
          updatedMember,
        );
      });

      it('applies the normalized email and notifies both addresses', async () => {
        (validateLoginEmailChange as jest.Mock).mockResolvedValue({
          oldEmail: 'old@company.dev',
          newEmail: 'new@company.io',
        });

        await service.updateById('mem_1', 'org_123', {
          email: ' New@Company.IO ',
        });

        expect(validateLoginEmailChange).toHaveBeenCalledWith({
          userId: 'usr_target',
          organizationId: 'org_123',
          requestedEmail: ' New@Company.IO ',
        });
        expect(MemberQueries.updateMember).toHaveBeenCalledWith(
          'mem_1',
          'org_123',
          { email: 'new@company.io' },
        );
        expect(notifyLoginEmailChanged).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org_123',
            change: {
              oldEmail: 'old@company.dev',
              newEmail: 'new@company.io',
            },
          }),
        );
      });

      it('drops a no-op email change and does not notify', async () => {
        (validateLoginEmailChange as jest.Mock).mockResolvedValue(null);

        await service.updateById('mem_1', 'org_123', {
          email: 'old@company.dev',
          department: 'it',
        });

        expect(MemberQueries.updateMember).toHaveBeenCalledWith(
          'mem_1',
          'org_123',
          { department: 'it' },
        );
        expect(notifyLoginEmailChanged).not.toHaveBeenCalled();
      });

      it('rejects combining a userId reassignment with an email change', async () => {
        await expect(
          service.updateById('mem_1', 'org_123', {
            userId: 'usr_other',
            email: 'new@company.io',
          }),
        ).rejects.toThrow(BadRequestException);

        expect(validateLoginEmailChange).not.toHaveBeenCalled();
        expect(MemberQueries.updateMember).not.toHaveBeenCalled();
      });

      it('returns the member without writing when the no-op email is the only field', async () => {
        (validateLoginEmailChange as jest.Mock).mockResolvedValue(null);
        (MemberQueries.findByIdInOrganization as jest.Mock).mockResolvedValue(
          updatedMember,
        );

        const result = await service.updateById('mem_1', 'org_123', {
          email: 'old@company.dev',
        });

        expect(result).toEqual(updatedMember);
        expect(MemberQueries.updateMember).not.toHaveBeenCalled();
      });

      it('translates a unique-constraint race on the write into a 409', async () => {
        (validateLoginEmailChange as jest.Mock).mockResolvedValue({
          oldEmail: 'old@company.dev',
          newEmail: 'new@company.io',
        });
        (MemberQueries.updateMember as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        );

        await expect(
          service.updateById('mem_1', 'org_123', { email: 'new@company.io' }),
        ).rejects.toThrow(ConflictException);
      });

      it('propagates ConflictException from validation without wrapping', async () => {
        (validateLoginEmailChange as jest.Mock).mockRejectedValue(
          new ConflictException('That email is already used by another account'),
        );

        await expect(
          service.updateById('mem_1', 'org_123', {
            email: 'taken@company.io',
          }),
        ).rejects.toThrow(ConflictException);

        expect(MemberQueries.updateMember).not.toHaveBeenCalled();
        expect(notifyLoginEmailChanged).not.toHaveBeenCalled();
      });
    });

    it('should validate new userId when changing user', async () => {
      const updateData = { userId: 'usr_new' };
      const existingMember = {
        id: 'mem_1',
        userId: 'usr_old',
        role: 'employee',
      };
      const updatedMember = {
        id: 'mem_1',
        user: { name: 'New' },
        role: 'employee',
      };

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
      setupCallerMember('usr_caller', 'org_123', 'admin');

      await service.updateById(
        'mem_1',
        'org_123',
        updateData as any,
        'usr_caller',
      );

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
      setupCallerMember('usr_caller', 'org_123', 'admin');

      await expect(
        service.updateById('mem_none', 'org_123', {} as any, 'usr_caller'),
      ).rejects.toThrow(NotFoundException);
    });

    describe('role authorization', () => {
      const targetMember = {
        id: 'mem_target',
        userId: 'usr_target',
        role: 'employee',
      };

      beforeEach(() => {
        (MemberValidator.validateOrganization as jest.Mock).mockResolvedValue(
          undefined,
        );
        (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
          targetMember,
        );
        (MemberQueries.updateMember as jest.Mock).mockResolvedValue({
          id: 'mem_target',
          user: { name: 'Target' },
          role: 'employee',
        });
      });

      it('should forbid admin from assigning owner role to themselves', async () => {
        const callerMember = {
          id: 'mem_self',
          userId: 'usr_caller',
          role: 'admin',
        };
        (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
          callerMember,
        );
        setupCallerMember('usr_caller', 'org_123', 'admin');

        await expect(
          service.updateById(
            'mem_self',
            'org_123',
            { role: 'owner' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should forbid admin from assigning owner role to another user', async () => {
        setupCallerMember('usr_caller', 'org_123', 'admin');

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'owner' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should forbid admin from changing their own role at all', async () => {
        const callerMember = {
          id: 'mem_self',
          userId: 'usr_caller',
          role: 'admin',
        };
        (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
          callerMember,
        );
        setupCallerMember('usr_caller', 'org_123', 'admin');

        await expect(
          service.updateById(
            'mem_self',
            'org_123',
            { role: 'auditor' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should forbid admin from assigning a role they do not have', async () => {
        setupCallerMember('usr_caller', 'org_123', 'admin');

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'custom_special' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow admin to assign auditor to another user', async () => {
        setupCallerMember('usr_caller', 'org_123', 'admin,auditor');

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'auditor' } as any,
            'usr_caller',
          ),
        ).resolves.toBeDefined();

        expect(MemberQueries.updateMember).toHaveBeenCalled();
      });

      it('should allow owner to demote/promote others without using owner role', async () => {
        setupCallerMember('usr_caller', 'org_123', 'owner');

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'admin' } as any,
            'usr_caller',
          ),
        ).resolves.toBeDefined();

        expect(MemberQueries.updateMember).toHaveBeenCalled();
      });

      it('should forbid demoting the owner via this endpoint (downgrade requires transfer-ownership)', async () => {
        const ownerTarget = {
          id: 'mem_target',
          userId: 'usr_target',
          role: 'owner',
        };
        (MemberValidator.validateMemberExists as jest.Mock).mockResolvedValue(
          ownerTarget,
        );
        setupCallerMember('usr_caller', 'org_123', 'owner');

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'admin' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should forbid update when caller is not a member of the org', async () => {
        (db.member.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { role: 'auditor' } as any,
            'usr_caller',
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should skip role authorization when role is not being changed', async () => {
        // When role is not in the update payload, no caller-role lookup or
        // self-mod check happens — non-role updates flow through unchanged.
        await expect(
          service.updateById(
            'mem_target',
            'org_123',
            { jobTitle: 'Director' } as any,
            'usr_caller',
          ),
        ).resolves.toBeDefined();
      });
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
        role: 'user',
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
      const updateCall = (db.member.update as jest.Mock).mock.calls[0]?.[0];
      expect(updateCall.where).toEqual({
        id: 'mem_1',
        organizationId: 'org_123',
      });
      expect(updateCall.data.deactivated).toBe(true);
      expect(updateCall.data.isActive).toBe(false);
      expect(updateCall.data.offboardDate).toBeInstanceOf(Date);
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
        user: { ...mockMember.user, role: 'admin' },
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

    describe('when skipOffboarding is true', () => {
      it('should set offboardDate to null to clear any pre-existing date', async () => {
        await service.deleteById('mem_1', 'org_123', 'usr_actor', {
          skipOffboarding: true,
        });

        const updateCall = (db.member.update as jest.Mock).mock.calls[0]?.[0];
        expect(updateCall.data).toEqual({
          deactivated: true,
          isActive: false,
          offboardDate: null,
        });
      });

      it('should not collect assigned items or notify the owner', async () => {
        await service.deleteById('mem_1', 'org_123', 'usr_actor', {
          skipOffboarding: true,
        });

        // collectAssignedItems is skipped — no findMany on tasks/policies/risks/vendors
        expect(db.task.findMany).not.toHaveBeenCalled();
        expect(db.policy.findMany).not.toHaveBeenCalled();
        expect(db.risk.findMany).not.toHaveBeenCalled();
        expect(db.vendor.findMany).not.toHaveBeenCalled();
        // notifyOwnerOfUnassignedItems is skipped — no owner lookup
        expect(db.organization.findUnique).not.toHaveBeenCalled();
      });

      it('should still clear assignments and delete sessions', async () => {
        await service.deleteById('mem_1', 'org_123', 'usr_actor', {
          skipOffboarding: true,
        });

        expect(db.task.updateMany).toHaveBeenCalledWith({
          where: { assigneeId: 'mem_1', organizationId: 'org_123' },
          data: { assigneeId: null },
        });
        expect(db.session.deleteMany).toHaveBeenCalledWith({
          where: { userId: 'usr_1' },
        });
      });
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
      expect(MemberQueries.unlinkDevice).toHaveBeenCalledWith(
        'mem_1',
        'org_123',
      );
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

      await expect(service.unlinkDevice('mem_none', 'org_123')).rejects.toThrow(
        NotFoundException,
      );
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
