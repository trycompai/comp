jest.mock('@trycompai/db', () => ({
  db: {
    organization: { count: jest.fn() },
    vendor: { findMany: jest.fn(), count: jest.fn() },
    frameworkInstance: { findMany: jest.fn(), count: jest.fn() },
    finding: { findMany: jest.fn(), count: jest.fn() },
    integration: { findMany: jest.fn(), count: jest.fn() },
    comment: { findMany: jest.fn(), count: jest.fn() },
    auditLog: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { AdminOrgDataService } from './admin-org-data.service';

const mockDb = db as jest.Mocked<typeof db>;
const ORG_ID = 'org_test123';

describe('AdminOrgDataService', () => {
  let service: AdminOrgDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOrgDataService();
    (mockDb.organization.count as jest.Mock).mockResolvedValue(1);
  });

  describe('verifyOrg', () => {
    it('should throw NotFoundException when org not found', async () => {
      (mockDb.organization.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.getOrgVendors({ orgId: 'org_bad', limit: 20, offset: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrgVendors', () => {
    it('should return paginated vendors', async () => {
      (mockDb.vendor.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.vendor.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgVendors({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
    });
  });

  describe('getOrgFrameworks', () => {
    it('should return paginated frameworks', async () => {
      const mockFrameworks = [
        { id: 'frm_1', frameworkId: 'frk_1', framework: { name: 'soc2', version: '2024' } },
      ];
      (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue(mockFrameworks);
      (mockDb.frameworkInstance.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getOrgFrameworks({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: mockFrameworks, count: 1 });
    });
  });

  describe('getOrgFindings', () => {
    it('should return paginated findings', async () => {
      (mockDb.finding.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.finding.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgFindings({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
    });

    it('should filter by status', async () => {
      (mockDb.finding.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.finding.count as jest.Mock).mockResolvedValue(0);

      await service.getOrgFindings({ orgId: ORG_ID, status: 'open', limit: 20, offset: 0 });

      expect(mockDb.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID, status: 'open' },
        }),
      );
    });
  });

  describe('getOrgIntegrations', () => {
    it('should return paginated integrations', async () => {
      (mockDb.integration.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.integration.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgIntegrations({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
    });
  });

  describe('getOrgComments', () => {
    it('should return paginated comments', async () => {
      const mockComments = [
        { id: 'cmt_1', content: 'test', entityType: 'task', author: { user: { name: 'Alice' } } },
      ];
      (mockDb.comment.findMany as jest.Mock).mockResolvedValue(mockComments);
      (mockDb.comment.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getOrgComments({ orgId: ORG_ID, limit: 20, offset: 0 });

      expect(result).toEqual({ data: mockComments, count: 1 });
    });
  });

  describe('getOrgAuditLogs', () => {
    it('should return paginated audit logs scoped to org', async () => {
      (mockDb.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockDb.auditLog.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getOrgAuditLogs({ orgId: ORG_ID, limit: 50, offset: 0 });

      expect(result).toEqual({ data: [], count: 0 });
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID },
        }),
      );
    });
  });
});
