jest.mock('@trycompai/db', () => ({ db: {} }));
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('./admin-org.service');

import { Test } from '@nestjs/testing';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminOrgController } from './admin-org.controller';
import { AdminOrgService } from './admin-org.service';

describe('AdminOrgController', () => {
  let controller: AdminOrgController;
  let service: jest.Mocked<AdminOrgService>;

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminOrgController],
      providers: [AdminOrgService],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(AdminOrgController);
    service = module.get(AdminOrgService) as jest.Mocked<AdminOrgService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrgHealth', () => {
    it('should pass orgId to service', async () => {
      const health = { org: { id: 'org_1' }, members: { total: 5 } };
      service.getOrgHealth = jest.fn().mockResolvedValue(health);

      const result = await controller.getOrgHealth('org_1');

      expect(result).toEqual(health);
      expect(service.getOrgHealth).toHaveBeenCalledWith('org_1');
    });
  });

  describe('getOrgMembers', () => {
    it('should pass default pagination params', async () => {
      service.getOrgMembers = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgMembers('org_1');

      expect(service.getOrgMembers).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });

    it('should parse string params to numbers', async () => {
      service.getOrgMembers = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgMembers('org_1', '10', '5');

      expect(service.getOrgMembers).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 10,
        offset: 5,
      });
    });
  });

  describe('getOrgPolicies', () => {
    it('should pass status filter', async () => {
      service.getOrgPolicies = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgPolicies('org_1', 'draft', '10', '0');

      expect(service.getOrgPolicies).toHaveBeenCalledWith({
        orgId: 'org_1',
        status: 'draft',
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getOrgTasks', () => {
    it('should pass status filter', async () => {
      service.getOrgTasks = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgTasks('org_1', 'todo');

      expect(service.getOrgTasks).toHaveBeenCalledWith({
        orgId: 'org_1',
        status: 'todo',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgControls', () => {
    it('should pass default pagination', async () => {
      service.getOrgControls = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgControls('org_1');

      expect(service.getOrgControls).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgRisks', () => {
    it('should pass status filter', async () => {
      service.getOrgRisks = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgRisks('org_1', 'open');

      expect(service.getOrgRisks).toHaveBeenCalledWith({
        orgId: 'org_1',
        status: 'open',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgVendors', () => {
    it('should pass default pagination', async () => {
      service.getOrgVendors = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgVendors('org_1');

      expect(service.getOrgVendors).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgFrameworks', () => {
    it('should pass default pagination', async () => {
      service.getOrgFrameworks = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgFrameworks('org_1');

      expect(service.getOrgFrameworks).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgFindings', () => {
    it('should pass status filter', async () => {
      service.getOrgFindings = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgFindings('org_1', 'open');

      expect(service.getOrgFindings).toHaveBeenCalledWith({
        orgId: 'org_1',
        status: 'open',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgIntegrations', () => {
    it('should pass default pagination', async () => {
      service.getOrgIntegrations = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgIntegrations('org_1');

      expect(service.getOrgIntegrations).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgComments', () => {
    it('should pass default pagination', async () => {
      service.getOrgComments = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgComments('org_1');

      expect(service.getOrgComments).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getOrgAuditLogs', () => {
    it('should pass default pagination with limit 50', async () => {
      service.getOrgAuditLogs = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.getOrgAuditLogs('org_1');

      expect(service.getOrgAuditLogs).toHaveBeenCalledWith({
        orgId: 'org_1',
        limit: 50,
        offset: 0,
      });
    });
  });
});
