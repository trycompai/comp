jest.mock('@trycompai/db', () => ({
  db: {
    organization: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    member: { count: jest.fn() },
    control: { count: jest.fn() },
    policy: { count: jest.fn() },
    risk: { count: jest.fn() },
    vendor: { count: jest.fn() },
    task: { count: jest.fn() },
    frameworkInstance: { count: jest.fn() },
    finding: { count: jest.fn() },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { AdminService } from './admin.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService();
  });

  describe('getStats', () => {
    it('should return counts for all platform entities', async () => {
      (mockDb.organization.count as jest.Mock).mockResolvedValue(5);
      (mockDb.user.count as jest.Mock).mockResolvedValue(50);
      (mockDb.member.count as jest.Mock).mockResolvedValue(100);
      (mockDb.control.count as jest.Mock).mockResolvedValue(200);
      (mockDb.policy.count as jest.Mock).mockResolvedValue(30);
      (mockDb.risk.count as jest.Mock).mockResolvedValue(15);
      (mockDb.vendor.count as jest.Mock).mockResolvedValue(10);
      (mockDb.task.count as jest.Mock).mockResolvedValue(75);
      (mockDb.frameworkInstance.count as jest.Mock).mockResolvedValue(8);
      (mockDb.finding.count as jest.Mock).mockResolvedValue(25);

      const result = await service.getStats();

      expect(result).toEqual({
        organizations: 5,
        users: 50,
        members: 100,
        controls: 200,
        policies: 30,
        risks: 15,
        vendors: 10,
        tasks: 75,
        frameworks: 8,
        findings: 25,
      });
    });

    it('should call all count queries in parallel', async () => {
      (mockDb.organization.count as jest.Mock).mockResolvedValue(0);
      (mockDb.user.count as jest.Mock).mockResolvedValue(0);
      (mockDb.member.count as jest.Mock).mockResolvedValue(0);
      (mockDb.control.count as jest.Mock).mockResolvedValue(0);
      (mockDb.policy.count as jest.Mock).mockResolvedValue(0);
      (mockDb.risk.count as jest.Mock).mockResolvedValue(0);
      (mockDb.vendor.count as jest.Mock).mockResolvedValue(0);
      (mockDb.task.count as jest.Mock).mockResolvedValue(0);
      (mockDb.frameworkInstance.count as jest.Mock).mockResolvedValue(0);
      (mockDb.finding.count as jest.Mock).mockResolvedValue(0);

      await service.getStats();

      expect(mockDb.organization.count).toHaveBeenCalledTimes(1);
      expect(mockDb.user.count).toHaveBeenCalledTimes(1);
      expect(mockDb.member.count).toHaveBeenCalledTimes(1);
      expect(mockDb.control.count).toHaveBeenCalledTimes(1);
      expect(mockDb.policy.count).toHaveBeenCalledTimes(1);
      expect(mockDb.risk.count).toHaveBeenCalledTimes(1);
      expect(mockDb.vendor.count).toHaveBeenCalledTimes(1);
      expect(mockDb.task.count).toHaveBeenCalledTimes(1);
      expect(mockDb.frameworkInstance.count).toHaveBeenCalledTimes(1);
      expect(mockDb.finding.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('listOrgs', () => {
    it('should return paginated organizations with counts', async () => {
      const mockOrgs = [
        { id: 'org_1', name: 'Org 1', _count: { members: 5, frameworkInstances: 2 } },
        { id: 'org_2', name: 'Org 2', _count: { members: 3, frameworkInstances: 1 } },
      ];
      (mockDb.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);
      (mockDb.organization.count as jest.Mock).mockResolvedValue(2);

      const result = await service.listOrgs({ limit: 20, offset: 0 });

      expect(result).toEqual({ data: mockOrgs, count: 2 });
      expect(mockDb.organization.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true, frameworkInstances: true } },
        },
      });
    });

    it('should respect pagination params', async () => {
      (mockDb.organization.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.organization.count as jest.Mock).mockResolvedValue(50);

      await service.listOrgs({ limit: 10, offset: 30 });

      expect(mockDb.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 30 }),
      );
    });
  });

  describe('searchOrgs', () => {
    it('should search orgs by name, slug, id, or member email', async () => {
      const mockOrgs = [
        { id: 'org_1', name: 'Acme Corp', _count: { members: 5, frameworkInstances: 2 } },
      ];
      (mockDb.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);

      const result = await service.searchOrgs('acme');

      expect(result).toEqual({ data: mockOrgs });
      expect(mockDb.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              { name: { contains: 'acme', mode: 'insensitive' } },
              { slug: { contains: 'acme', mode: 'insensitive' } },
            ]),
          },
          take: 20,
        }),
      );
    });

    it('should return empty data for short queries', async () => {
      const result = await service.searchOrgs('a');

      expect(result).toEqual({ data: [] });
      expect(mockDb.organization.findMany).not.toHaveBeenCalled();
    });

    it('should return empty data for empty query', async () => {
      const result = await service.searchOrgs('');

      expect(result).toEqual({ data: [] });
      expect(mockDb.organization.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getOrg', () => {
    it('should return organization details with counts', async () => {
      const mockOrg = {
        id: 'org_1',
        name: 'Test Org',
        _count: {
          members: 10,
          frameworkInstances: 3,
          controls: 50,
          policy: 20,
          risk: 5,
          vendors: 8,
          tasks: 30,
          findings: 12,
        },
      };
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const result = await service.getOrg('org_1');

      expect(result).toEqual(mockOrg);
      expect(mockDb.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org_1' },
        include: {
          _count: {
            select: {
              members: true,
              frameworkInstances: true,
              controls: true,
              policy: true,
              risk: true,
              vendors: true,
              tasks: true,
              findings: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when org not found', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrg('org_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users with counts', async () => {
      const mockUsers = [
        {
          id: 'usr_1',
          name: 'User 1',
          email: 'user1@test.com',
          isPlatformAdmin: false,
          createdAt: new Date(),
          lastLogin: null,
          _count: { members: 2, sessions: 1 },
        },
      ];
      (mockDb.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (mockDb.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.listUsers({ limit: 20, offset: 0 });

      expect(result).toEqual({ data: mockUsers, count: 1 });
      expect(mockDb.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users by email with org memberships', async () => {
      const mockUsers = [
        {
          id: 'usr_1',
          name: 'John',
          email: 'john@test.com',
          isPlatformAdmin: false,
          createdAt: new Date(),
          lastLogin: null,
          members: [
            {
              id: 'mem_1',
              role: 'admin',
              deactivated: false,
              organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
            },
          ],
        },
      ];
      (mockDb.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.searchUsers('john@');

      expect(result).toEqual({ data: mockUsers });
      expect(mockDb.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { contains: 'john@', mode: 'insensitive' } },
          take: 20,
        }),
      );
    });

    it('should return empty data for short queries', async () => {
      const result = await service.searchUsers('j');

      expect(result).toEqual({ data: [] });
      expect(mockDb.user.findMany).not.toHaveBeenCalled();
    });

    it('should return empty data for empty query', async () => {
      const result = await service.searchUsers('');

      expect(result).toEqual({ data: [] });
      expect(mockDb.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return user details with memberships and sessions', async () => {
      const mockUser = {
        id: 'usr_1',
        name: 'Test User',
        email: 'test@test.com',
        isPlatformAdmin: false,
        createdAt: new Date(),
        lastLogin: null,
        members: [
          {
            id: 'mem_1',
            role: 'admin',
            createdAt: new Date(),
            organization: { id: 'org_1', name: 'Test Org', slug: 'test-org' },
          },
        ],
        sessions: [
          {
            id: 'ses_1',
            createdAt: new Date(),
            expiresAt: new Date(),
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
          },
        ],
      };
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUser('usr_1');

      expect(result).toEqual(mockUser);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        select: expect.objectContaining({
          id: true,
          name: true,
          email: true,
          isPlatformAdmin: true,
          members: expect.any(Object),
          sessions: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUser('usr_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('togglePlatformAdmin', () => {
    it('should toggle isPlatformAdmin from false to true', async () => {
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        isPlatformAdmin: false,
      });
      (mockDb.user.update as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'test@test.com',
        isPlatformAdmin: true,
      });

      const result = await service.togglePlatformAdmin('usr_1');

      expect(result.isPlatformAdmin).toBe(true);
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { isPlatformAdmin: true },
        select: { id: true, email: true, isPlatformAdmin: true },
      });
    });

    it('should toggle isPlatformAdmin from true to false when multiple admins exist', async () => {
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        isPlatformAdmin: true,
      });
      (mockDb.user.count as jest.Mock).mockResolvedValue(2);
      (mockDb.user.update as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'test@test.com',
        isPlatformAdmin: false,
      });

      const result = await service.togglePlatformAdmin('usr_1');

      expect(result.isPlatformAdmin).toBe(false);
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { isPlatformAdmin: false },
        select: { id: true, email: true, isPlatformAdmin: true },
      });
    });

    it('should prevent demoting the last platform admin', async () => {
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        isPlatformAdmin: true,
      });
      (mockDb.user.count as jest.Mock).mockResolvedValue(1);

      await expect(service.togglePlatformAdmin('usr_1')).rejects.toThrow(
        'Cannot demote the last platform admin',
      );
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.togglePlatformAdmin('usr_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'aud_1',
          timestamp: new Date(),
          organizationId: 'org_1',
          userId: 'usr_1',
          memberId: 'mem_1',
          description: 'Updated control',
          entityId: 'ctl_1',
          entityType: 'control',
          data: {},
        },
      ];
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getAuditLogs({
        limit: 50,
        offset: 0,
      });

      expect(result).toEqual({ data: mockLogs, count: 1 });
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        take: 50,
        skip: 0,
        orderBy: { timestamp: 'desc' },
        select: expect.objectContaining({
          id: true,
          timestamp: true,
          organizationId: true,
        }),
      });
    });

    it('should filter by orgId', async () => {
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.getAuditLogs({
        orgId: 'org_1',
        limit: 50,
        offset: 0,
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1' },
        }),
      );
    });

    it('should filter by entityType', async () => {
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.getAuditLogs({
        entityType: 'control',
        limit: 50,
        offset: 0,
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'control' },
        }),
      );
    });

    it('should filter by both orgId and entityType', async () => {
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.getAuditLogs({
        orgId: 'org_1',
        entityType: 'policy',
        limit: 25,
        offset: 10,
      });

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_1', entityType: 'policy' },
          take: 25,
          skip: 10,
        }),
      );
      expect(mockDb.auditLog.count).toHaveBeenCalledWith({
        where: { organizationId: 'org_1', entityType: 'policy' },
      });
    });
  });
});
