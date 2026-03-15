jest.mock('@trycompai/db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    member: { findMany: jest.fn(), count: jest.fn() },
    policy: { findMany: jest.fn(), count: jest.fn() },
    task: { findMany: jest.fn(), count: jest.fn() },
    control: { findMany: jest.fn(), count: jest.fn() },
    risk: { findMany: jest.fn(), count: jest.fn() },
    vendor: { count: jest.fn() },
    frameworkInstance: { count: jest.fn() },
    finding: { count: jest.fn() },
    integration: { count: jest.fn() },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { AdminOrgService } from './admin-org.service';

const mockDb = db as jest.Mocked<typeof db>;
const ORG_ID = 'org_test123';
const MOCK_ORG = { id: ORG_ID, name: 'Test Org', onboardingCompleted: true };

describe('AdminOrgService', () => {
  let service: AdminOrgService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOrgService();
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(MOCK_ORG);
  });

  describe('verifyOrg (via getOrgHealth)', () => {
    it('should throw NotFoundException when org not found', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getOrgHealth('org_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrgHealth', () => {
    it('should return diagnostic summary', async () => {
      // Mock all count calls to return 0
      const countMocks = [
        mockDb.member, mockDb.task, mockDb.policy,
        mockDb.risk, mockDb.finding, mockDb.integration,
        mockDb.vendor, mockDb.frameworkInstance, mockDb.control,
      ];
      for (const mock of countMocks) {
        (mock.count as jest.Mock).mockResolvedValue(0);
      }

      const result = await service.getOrgHealth(ORG_ID);

      expect(result.org).toEqual(MOCK_ORG);
      expect(result.members).toEqual({ total: 0, active: 0, deactivated: 0 });
      expect(result.tasks).toHaveProperty('total');
      expect(result.tasks).toHaveProperty('overdue');
      expect(result.tasks).toHaveProperty('byStatus');
      expect(result.policies).toHaveProperty('total');
      expect(result.policies).toHaveProperty('draft');
      expect(result.policies).toHaveProperty('published');
      expect(result.risks).toHaveProperty('total');
      expect(result.risks).toHaveProperty('open');
      expect(result.findings).toHaveProperty('total');
      expect(result.integrations).toHaveProperty('total');
      expect(result.integrations).toHaveProperty('stale');
      expect(result.vendors).toHaveProperty('total');
      expect(result.vendors).toHaveProperty('notAssessed');
      expect(result.frameworks).toHaveProperty('total');
      expect(result.controls).toHaveProperty('total');
    });
  });

  describe('getOrgMembers', () => {
    it('should return paginated members', async () => {
      const mockMembers = [
        { id: 'mem_1', role: 'admin', user: { name: 'Alice', email: 'alice@test.com' } },
      ];
      (mockDb.member.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (mockDb.member.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getOrgMembers({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: mockMembers, count: 1 });
      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID },
          take: 20,
          skip: 0,
        }),
      );
    });

    it('should throw NotFoundException for invalid org', async () => {
      (mockDb.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getOrgMembers({ orgId: 'org_bad', limit: 20, offset: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrgPolicies', () => {
    it('should return paginated policies', async () => {
      (mockDb.policy.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.policy.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgPolicies({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
      expect(mockDb.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG_ID } }),
      );
    });

    it('should filter by status', async () => {
      (mockDb.policy.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.policy.count as jest.Mock).mockResolvedValue(0);

      await service.getOrgPolicies({ orgId: ORG_ID, status: 'draft', limit: 20, offset: 0 });

      expect(mockDb.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID, status: 'draft' },
        }),
      );
    });
  });

  describe('getOrgTasks', () => {
    it('should return paginated tasks', async () => {
      const mockTasks = [{ id: 'tsk_1', title: 'Task 1', status: 'todo' }];
      (mockDb.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (mockDb.task.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getOrgTasks({ orgId: ORG_ID, limit: 10, offset: 0 });

      expect(result).toEqual({ data: mockTasks, count: 1 });
    });

    it('should filter by status', async () => {
      (mockDb.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.task.count as jest.Mock).mockResolvedValue(0);

      await service.getOrgTasks({ orgId: ORG_ID, status: 'todo', limit: 20, offset: 0 });

      expect(mockDb.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID, status: 'todo' },
        }),
      );
    });
  });

  describe('getOrgControls', () => {
    it('should return paginated controls', async () => {
      (mockDb.control.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.control.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgControls({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
      expect(mockDb.control.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG_ID } }),
      );
    });
  });

  describe('getOrgRisks', () => {
    it('should return paginated risks', async () => {
      (mockDb.risk.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.risk.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgRisks({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
    });

    it('should filter by status', async () => {
      (mockDb.risk.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.risk.count as jest.Mock).mockResolvedValue(0);

      await service.getOrgRisks({ orgId: ORG_ID, status: 'open', limit: 20, offset: 0 });

      expect(mockDb.risk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID, status: 'open' },
        }),
      );
    });
  });

});
