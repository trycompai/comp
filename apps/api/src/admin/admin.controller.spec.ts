jest.mock('@trycompai/db', () => ({ db: {} }));
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('./admin.service');

import { Test } from '@nestjs/testing';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [AdminService],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(AdminController);
    service = module.get(AdminService) as jest.Mocked<AdminService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should call service.getStats and return result', async () => {
      const stats = {
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
      };
      service.getStats = jest.fn().mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(service.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('listOrgs', () => {
    it('should pass default pagination params', async () => {
      service.listOrgs = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.listOrgs();

      expect(service.listOrgs).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });

    it('should parse string params to numbers', async () => {
      service.listOrgs = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.listOrgs('10', '30');

      expect(service.listOrgs).toHaveBeenCalledWith({
        limit: 10,
        offset: 30,
      });
    });
  });

  describe('searchOrgs', () => {
    it('should pass query to service', async () => {
      service.searchOrgs = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'org_1', name: 'Acme' }] });

      const result = await controller.searchOrgs('acme');

      expect(result).toEqual({ data: [{ id: 'org_1', name: 'Acme' }] });
      expect(service.searchOrgs).toHaveBeenCalledWith('acme');
    });
  });

  describe('getOrg', () => {
    it('should pass id to service', async () => {
      const org = { id: 'org_1', name: 'Test' };
      service.getOrg = jest.fn().mockResolvedValue(org);

      const result = await controller.getOrg('org_1');

      expect(result).toEqual(org);
      expect(service.getOrg).toHaveBeenCalledWith('org_1');
    });
  });

  describe('searchUsers', () => {
    it('should pass email query to service', async () => {
      service.searchUsers = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'usr_1' }] });

      const result = await controller.searchUsers('john@');

      expect(result).toEqual({ data: [{ id: 'usr_1' }] });
      expect(service.searchUsers).toHaveBeenCalledWith('john@');
    });
  });

  describe('listUsers', () => {
    it('should pass default pagination params', async () => {
      service.listUsers = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.listUsers();

      expect(service.listUsers).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });

    it('should parse string params to numbers', async () => {
      service.listUsers = jest.fn().mockResolvedValue({ data: [], count: 0 });

      await controller.listUsers('5', '10');

      expect(service.listUsers).toHaveBeenCalledWith({
        limit: 5,
        offset: 10,
      });
    });
  });

  describe('getUser', () => {
    it('should pass id to service', async () => {
      const user = { id: 'usr_1', name: 'Test', email: 'test@t.com' };
      service.getUser = jest.fn().mockResolvedValue(user);

      const result = await controller.getUser('usr_1');

      expect(result).toEqual(user);
      expect(service.getUser).toHaveBeenCalledWith('usr_1');
    });
  });

  describe('togglePlatformAdmin', () => {
    it('should pass id to service', async () => {
      const updated = {
        id: 'usr_1',
        email: 'test@t.com',
        isPlatformAdmin: true,
      };
      service.togglePlatformAdmin = jest.fn().mockResolvedValue(updated);

      const result = await controller.togglePlatformAdmin('usr_1');

      expect(result).toEqual(updated);
      expect(service.togglePlatformAdmin).toHaveBeenCalledWith('usr_1');
    });
  });

  describe('getAuditLogs', () => {
    it('should pass default params when no filters provided', async () => {
      service.getAuditLogs = jest
        .fn()
        .mockResolvedValue({ data: [], count: 0 });

      await controller.getAuditLogs();

      expect(service.getAuditLogs).toHaveBeenCalledWith({
        orgId: undefined,
        entityType: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should pass all filters to service', async () => {
      service.getAuditLogs = jest
        .fn()
        .mockResolvedValue({ data: [], count: 0 });

      await controller.getAuditLogs('org_1', 'control', '25', '10');

      expect(service.getAuditLogs).toHaveBeenCalledWith({
        orgId: 'org_1',
        entityType: 'control',
        limit: 25,
        offset: 10,
      });
    });
  });
});
