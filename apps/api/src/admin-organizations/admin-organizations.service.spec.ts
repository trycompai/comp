import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminOrganizationsService } from './admin-organizations.service';

jest.mock('@db', () => ({
  db: {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
  AuditLogEntityType: {
    organization: 'organization',
    framework: 'framework',
    requirement: 'requirement',
    control: 'control',
    policy: 'policy',
    task: 'task',
    people: 'people',
    risk: 'risk',
    vendor: 'vendor',
    tests: 'tests',
    integration: 'integration',
    trust: 'trust',
    finding: 'finding',
    pentest: 'pentest',
  },
}));

jest.mock('../email/trigger-email', () => ({
  triggerEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../email/templates/invite-member', () => ({
  InviteEmail: jest.fn().mockReturnValue(null),
}));

import { db } from '@db';

const mockDb = db as jest.Mocked<typeof db>;

describe('AdminOrganizationsService', () => {
  let service: AdminOrganizationsService;

  beforeEach(() => {
    service = new AdminOrganizationsService();
    jest.clearAllMocks();
  });

  describe('listOrganizations', () => {
    it('should return paginated organizations with member counts', async () => {
      const mockOrgs = [
        {
          id: 'org_1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          logo: null,
          createdAt: new Date('2024-01-01'),
          hasAccess: true,
          onboardingCompleted: true,
          _count: { members: 5 },
          members: [
            { user: { id: 'usr_1', name: 'Owner', email: 'owner@acme.com' } },
          ],
        },
      ];

      (mockDb.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);
      (mockDb.organization.count as jest.Mock).mockResolvedValue(1);

      const result = await service.listOrganizations({
        page: 1,
        limit: 50,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('org_1');
      expect(result.data[0].memberCount).toBe(5);
      expect(result.data[0].owner).toEqual({
        id: 'usr_1',
        name: 'Owner',
        email: 'owner@acme.com',
      });
      expect(result.total).toBe(1);
    });

    it('should filter by search term', async () => {
      (mockDb.organization.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.organization.count as jest.Mock).mockResolvedValue(0);

      await service.listOrganizations({
        search: 'acme',
        page: 1,
        limit: 50,
      });

      expect(mockDb.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: { contains: 'acme', mode: 'insensitive' } },
              { name: { contains: 'acme', mode: 'insensitive' } },
              { slug: { contains: 'acme', mode: 'insensitive' } },
              {
                members: {
                  some: {
                    role: { contains: 'owner' },
                    user: {
                      name: { contains: 'acme', mode: 'insensitive' },
                    },
                  },
                },
              },
              {
                members: {
                  some: {
                    role: { contains: 'owner' },
                    user: {
                      email: { contains: 'acme', mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          },
        }),
      );
    });

    it('should handle orgs with no owner', async () => {
      const mockOrgs = [
        {
          id: 'org_2',
          name: 'No Owner Corp',
          slug: 'no-owner',
          logo: null,
          createdAt: new Date(),
          hasAccess: false,
          onboardingCompleted: false,
          _count: { members: 0 },
          members: [],
        },
      ];

      (mockDb.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);
      (mockDb.organization.count as jest.Mock).mockResolvedValue(1);

      const result = await service.listOrganizations({
        page: 1,
        limit: 50,
      });

      expect(result.data[0].owner).toBeNull();
    });
  });

  describe('getOrganization', () => {
    it('should return org with members', async () => {
      const mockOrg = {
        id: 'org_1',
        name: 'Acme',
        slug: 'acme',
        logo: null,
        createdAt: new Date(),
        hasAccess: true,
        onboardingCompleted: true,
        website: 'https://acme.com',
        members: [
          {
            id: 'mem_1',
            role: 'owner',
            createdAt: new Date(),
            user: {
              id: 'usr_1',
              name: 'Owner',
              email: 'owner@acme.com',
              image: null,
            },
          },
        ],
      };

      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const result = await service.getOrganization('org_1');
      expect(result.id).toBe('org_1');
      expect(result.members).toHaveLength(1);
      expect(mockDb.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ backgroundCheckStepEnabled: true }),
        }),
      );
    });

    it('should throw NotFoundException for missing org', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrganization('org_missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrganization', () => {
    it('single-field update (hasAccess)', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (mockDb.organization.update as jest.Mock).mockResolvedValue({
        id: 'org_1',
        hasAccess: true,
      });

      const result = await service.updateOrganization('org_1', {
        hasAccess: true,
      });

      expect(result.success).toBe(true);
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        data: { hasAccess: true },
      });
    });

    it('single-field update (backgroundCheckStepEnabled)', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (mockDb.organization.update as jest.Mock).mockResolvedValue({
        id: 'org_1',
        backgroundCheckStepEnabled: false,
      });

      const result = await service.updateOrganization('org_1', {
        backgroundCheckStepEnabled: false,
      });

      expect(result.success).toBe(true);
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        data: { backgroundCheckStepEnabled: false },
      });
    });

    it('multi-field update', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (mockDb.organization.update as jest.Mock).mockResolvedValue({
        id: 'org_1',
        hasAccess: true,
        backgroundCheckStepEnabled: false,
      });

      const result = await service.updateOrganization('org_1', {
        hasAccess: true,
        backgroundCheckStepEnabled: false,
      });

      expect(result.success).toBe(true);
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        data: { hasAccess: true, backgroundCheckStepEnabled: false },
      });
    });

    it('throws NotFoundException for missing org', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateOrganization('org_missing', { hasAccess: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteMember', () => {
    it('should create invitation and return success', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
        name: 'Acme',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.invitation.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (mockDb.invitation.create as jest.Mock).mockResolvedValue({
        id: 'inv_1',
      });

      const result = await service.inviteMember({
        orgId: 'org_1',
        email: 'new@example.com',
        role: 'admin',
        adminUserId: 'usr_admin',
      });

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('inv_1');
      expect(mockDb.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            organizationId: 'org_1',
            role: 'admin',
            status: 'pending',
            inviterId: 'usr_admin',
          }),
        }),
      );
    });

    it('should throw NotFoundException if org does not exist', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.inviteMember({
          orgId: 'org_missing',
          email: 'new@example.com',
          role: 'admin',
          adminUserId: 'usr_admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already an active member', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
        name: 'Acme',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'usr_existing',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem_1',
        deactivated: false,
      });

      await expect(
        service.inviteMember({
          orgId: 'org_1',
          email: 'existing@example.com',
          role: 'admin',
          adminUserId: 'usr_admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel existing pending invitations before creating new one', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
        name: 'Acme',
      });
      (mockDb.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.invitation.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (mockDb.invitation.create as jest.Mock).mockResolvedValue({
        id: 'inv_2',
      });

      await service.inviteMember({
        orgId: 'org_1',
        email: 'Re-Invite@Example.com',
        role: 'employee',
        adminUserId: 'usr_admin',
      });

      expect(mockDb.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          email: 're-invite@example.com',
          organizationId: 'org_1',
          status: 'pending',
        },
        data: { status: 'canceled' },
      });
    });
  });

  describe('listInvitations', () => {
    it('should return pending invitations for an org', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      const mockInvitations = [
        {
          id: 'inv_1',
          email: 'user@test.com',
          role: 'admin',
          status: 'pending',
          expiresAt: new Date(),
          createdAt: new Date(),
          user: { name: 'Admin', email: 'admin@test.com' },
        },
      ];
      (mockDb.invitation.findMany as jest.Mock).mockResolvedValue(
        mockInvitations,
      );

      const result = await service.listInvitations('org_1');

      expect(result).toEqual(mockInvitations);
      expect(mockDb.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1', status: 'pending' },
        }),
      );
    });

    it('should throw NotFoundException for missing org', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.listInvitations('org_missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revokeInvitation', () => {
    it('should cancel the invitation', async () => {
      (mockDb.invitation.findFirst as jest.Mock).mockResolvedValue({
        id: 'inv_1',
        organizationId: 'org_1',
      });
      (mockDb.invitation.update as jest.Mock).mockResolvedValue({
        id: 'inv_1',
        status: 'canceled',
      });

      const result = await service.revokeInvitation('org_1', 'inv_1');

      expect(result.success).toBe(true);
      expect(mockDb.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: { status: 'canceled' },
      });
    });

    it('should throw NotFoundException for missing invitation', async () => {
      (mockDb.invitation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.revokeInvitation('org_1', 'inv_missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditLogs', () => {
    const mockLogs = [{ id: 'aud_1' }, { id: 'aud_2' }];

    beforeEach(() => {
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(42);
    });

    it('passes skip/take to findMany and returns { data, total }', async () => {
      const result = await service.getAuditLogs({
        orgId: 'org_1',
        take: '25',
        offset: '50',
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1' },
          take: 25,
          skip: 50,
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(mockDb.auditLog.count).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
      });
      expect(result).toEqual({ data: mockLogs, total: 42 });
    });

    it('uses the SAME where for count and findMany', async () => {
      await service.getAuditLogs({ orgId: 'org_1', entityType: 'policy' });

      const findManyWhere = (mockDb.auditLog.findMany as jest.Mock).mock
        .calls[0][0].where;
      const countWhere = (mockDb.auditLog.count as jest.Mock).mock.calls[0][0]
        .where;

      expect(findManyWhere).toEqual(countWhere);
    });

    it('defaults take to 100 and offset to 0', async () => {
      await service.getAuditLogs({ orgId: 'org_1' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 }),
      );
    });

    it('clamps take to a max of 200', async () => {
      await service.getAuditLogs({ orgId: 'org_1', take: '1000' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('clamps take to a min of 1', async () => {
      await service.getAuditLogs({ orgId: 'org_1', take: '0' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('clamps a negative offset to 0', async () => {
      await service.getAuditLogs({ orgId: 'org_1', offset: '-10' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('clamps a NaN offset to 0', async () => {
      await service.getAuditLogs({ orgId: 'org_1', offset: 'abc' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('clamps an oversized offset to the maximum', async () => {
      await service.getAuditLogs({ orgId: 'org_1', offset: '999999999' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100_000 }),
      );
    });

    it('builds a single-value entityType filter', async () => {
      await service.getAuditLogs({ orgId: 'org_1', entityType: 'policy' });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1', entityType: 'policy' },
        }),
      );
    });

    it('builds an { in: [...] } filter for multiple entityTypes', async () => {
      await service.getAuditLogs({
        orgId: 'org_1',
        entityType: 'policy, task',
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org_1',
            entityType: { in: ['policy', 'task'] },
          },
        }),
      );
    });

    it('throws BadRequestException for an invalid entityType', async () => {
      await expect(
        service.getAuditLogs({ orgId: 'org_1', entityType: 'not_a_type' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
