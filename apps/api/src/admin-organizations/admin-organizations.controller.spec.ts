import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminOrganizationsService } from './admin-organizations.service';

jest.mock('../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: {} },
}));

jest.mock('@trycompai/db', () => ({ db: {} }));

describe('AdminOrganizationsController', () => {
  let controller: AdminOrganizationsController;

  const mockService = {
    listOrganizations: jest.fn(),
    getOrganization: jest.fn(),
    setAccess: jest.fn(),
    inviteMember: jest.fn(),
    listInvitations: jest.fn(),
    revokeInvitation: jest.fn(),
    getAuditLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrganizationsController],
      providers: [
        { provide: AdminOrganizationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AdminOrganizationsController>(
      AdminOrganizationsController,
    );
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should call service with parsed params', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 50 };
      mockService.listOrganizations.mockResolvedValue(mockResult);

      const result = await controller.list('acme', '2', '25');

      expect(mockService.listOrganizations).toHaveBeenCalledWith({
        search: 'acme',
        page: 2,
        limit: 25,
      });
      expect(result).toEqual(mockResult);
    });

    it('should use defaults for missing params', async () => {
      mockService.listOrganizations.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });

      await controller.list();

      expect(mockService.listOrganizations).toHaveBeenCalledWith({
        search: undefined,
        page: 1,
        limit: 50,
      });
    });

    it('should clamp limit to max 100', async () => {
      mockService.listOrganizations.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
      });

      await controller.list(undefined, undefined, '999');

      expect(mockService.listOrganizations).toHaveBeenCalledWith({
        search: undefined,
        page: 1,
        limit: 100,
      });
    });
  });

  describe('get', () => {
    it('should call service with org id', async () => {
      const mockOrg = { id: 'org_1', name: 'Acme' };
      mockService.getOrganization.mockResolvedValue(mockOrg);

      const result = await controller.get('org_1');

      expect(mockService.getOrganization).toHaveBeenCalledWith('org_1');
      expect(result).toEqual(mockOrg);
    });
  });

  describe('activate', () => {
    it('should call setAccess with true', async () => {
      mockService.setAccess.mockResolvedValue({ success: true });

      const result = await controller.activate('org_1');

      expect(mockService.setAccess).toHaveBeenCalledWith('org_1', true);
      expect(result).toEqual({ success: true });
    });
  });

  describe('deactivate', () => {
    it('should call setAccess with false', async () => {
      mockService.setAccess.mockResolvedValue({ success: true });

      const result = await controller.deactivate('org_1');

      expect(mockService.setAccess).toHaveBeenCalledWith('org_1', false);
      expect(result).toEqual({ success: true });
    });
  });

  describe('inviteMember', () => {
    it('should call service with correct params', async () => {
      const mockResult = { success: true, invitationId: 'inv_1' };
      mockService.inviteMember.mockResolvedValue(mockResult);

      const result = await controller.inviteMember(
        'org_1',
        { userId: 'usr_admin' } as { userId: string },
        { email: 'user@test.com', role: 'admin' },
      );

      expect(mockService.inviteMember).toHaveBeenCalledWith({
        orgId: 'org_1',
        email: 'user@test.com',
        role: 'admin',
        adminUserId: 'usr_admin',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('listInvitations', () => {
    it('should call service with org id', async () => {
      const mockInvitations = [{ id: 'inv_1', email: 'user@test.com' }];
      mockService.listInvitations.mockResolvedValue(mockInvitations);

      const result = await controller.listInvitations('org_1');

      expect(mockService.listInvitations).toHaveBeenCalledWith('org_1');
      expect(result).toEqual(mockInvitations);
    });
  });

  describe('revokeInvitation', () => {
    it('should call service with org id and invitation id', async () => {
      mockService.revokeInvitation.mockResolvedValue({ success: true });

      const result = await controller.revokeInvitation('org_1', 'inv_1');

      expect(mockService.revokeInvitation).toHaveBeenCalledWith(
        'org_1',
        'inv_1',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getAuditLogs', () => {
    it('should call service with org id and query params', async () => {
      const mockResult = { data: [{ id: 'aud_1' }] };
      mockService.getAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.getAuditLogs('org_1', 'policy', '50');

      expect(mockService.getAuditLogs).toHaveBeenCalledWith({
        orgId: 'org_1',
        entityType: 'policy',
        take: '50',
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass undefined for optional params', async () => {
      mockService.getAuditLogs.mockResolvedValue({ data: [] });

      await controller.getAuditLogs('org_1');

      expect(mockService.getAuditLogs).toHaveBeenCalledWith({
        orgId: 'org_1',
        entityType: undefined,
        take: undefined,
      });
    });
  });
});
