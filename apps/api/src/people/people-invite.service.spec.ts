import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PeopleInviteService } from './people-invite.service';

jest.mock('@db', () => ({
  db: {
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
    },
    employeeTrainingVideoCompletion: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('../email/trigger-email', () => ({
  triggerEmail: jest.fn().mockResolvedValue({ id: 'trigger_123' }),
}));

jest.mock('../email/templates/invite-member', () => ({
  InviteEmail: jest.fn().mockReturnValue('mocked-react-element'),
}));

import { db } from '@db';
import { triggerEmail } from '../email/trigger-email';

const mockDb = db as jest.Mocked<typeof db>;
const mockTriggerEmail = triggerEmail as jest.Mock;

describe('PeopleInviteService', () => {
  let service: PeopleInviteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PeopleInviteService],
    }).compile();

    service = module.get<PeopleInviteService>(PeopleInviteService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteMembers', () => {
    const baseParams = {
      organizationId: 'org_123',
      callerUserId: 'user_caller',
      callerRole: 'admin,owner',
    };

    it('should throw ForbiddenException for unauthorized roles', async () => {
      await expect(
        service.inviteMembers({
          ...baseParams,
          callerRole: 'employee',
          invites: [{ email: 'test@example.com', roles: ['employee'] }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should restrict auditors to only invite auditors', async () => {
      const results = await service.inviteMembers({
        ...baseParams,
        callerRole: 'auditor',
        invites: [{ email: 'test@example.com', roles: ['admin'] }],
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Auditors can only invite');
    });

    it('should allow auditors to invite other auditors', async () => {
      // inviteWithCheck path: user doesn't exist → create invitation
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.invitation.create as jest.Mock).mockResolvedValue({
        id: 'inv_auditor',
      });

      const results = await service.inviteMembers({
        ...baseParams,
        callerRole: 'auditor',
        invites: [{ email: 'auditor@example.com', roles: ['auditor'] }],
      });

      expect(results[0].success).toBe(true);
      expect(mockDb.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'auditor@example.com',
            role: 'auditor',
          }),
        }),
      );
    });

    it('should add employee without invitation for employee/contractor roles', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'emp@example.com',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.member.create as jest.Mock).mockResolvedValue({
        id: 'member_new',
      });
      (mockDb.employeeTrainingVideoCompletion.createMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [{ email: 'emp@example.com', roles: ['employee'] }],
      });

      expect(results[0].success).toBe(true);
      expect(results[0].emailSent).toBe(true);
      expect(mockDb.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'employee',
            organizationId: 'org_123',
          }),
        }),
      );
    });

    it('should reactivate deactivated members', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user_existing',
        email: 'emp@example.com',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member_existing',
        deactivated: true,
      });
      (mockDb.member.update as jest.Mock).mockResolvedValue({
        id: 'member_existing',
      });

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [{ email: 'emp@example.com', roles: ['employee'] }],
      });

      expect(results[0].success).toBe(true);
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deactivated: false,
            role: 'employee',
          }),
        }),
      );
    });

    it('should handle multiple invites', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'test@example.com',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.member.create as jest.Mock).mockResolvedValue({
        id: 'member_new',
      });
      (mockDb.employeeTrainingVideoCompletion.createMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [
          { email: 'emp1@example.com', roles: ['employee'] },
          { email: 'emp2@example.com', roles: ['contractor'] },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should continue processing when one invite fails', async () => {
      (mockDb.organization.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First org lookup fails
        .mockResolvedValueOnce({ name: 'Test Org' }); // Second succeeds
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'test@example.com',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.member.create as jest.Mock).mockResolvedValue({
        id: 'member_new',
      });
      (mockDb.employeeTrainingVideoCompletion.createMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [
          { email: 'fail@example.com', roles: ['employee'] },
          { email: 'success@example.com', roles: ['employee'] },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it('should handle email send failure gracefully', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'emp@example.com',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.member.create as jest.Mock).mockResolvedValue({
        id: 'member_new',
      });
      (mockDb.employeeTrainingVideoCompletion.createMany as jest.Mock).mockResolvedValue({
        count: 5,
      });
      mockTriggerEmail.mockRejectedValueOnce(new Error('Email service down'));

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [{ email: 'emp@example.com', roles: ['employee'] }],
      });

      expect(results[0].success).toBe(true);
      expect(results[0].emailSent).toBe(false);
    });

    it('should create invitation for admin role invites', async () => {
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
      });
      (mockDb.invitation.create as jest.Mock).mockResolvedValue({
        id: 'inv_new',
      });

      const results = await service.inviteMembers({
        ...baseParams,
        invites: [{ email: 'admin@example.com', roles: ['admin'] }],
      });

      expect(results[0].success).toBe(true);
      expect(mockDb.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'admin@example.com',
            role: 'admin',
            status: 'pending',
          }),
        }),
      );
    });
  });
});
