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

jest.mock('@db', () => ({
  db: {},
  AuditLogEntityType: {
    organization: 'organization',
    people: 'people',
    control: 'control',
    policy: 'policy',
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    finding: 'finding',
    framework: 'framework',
    integration: 'integration',
    trust: 'trust',
  },
  CommentEntityType: {
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    policy: 'policy',
  },
}));

describe('AdminOrganizationsController', () => {
  let controller: AdminOrganizationsController;

  const mockService = {
    listOrganizations: jest.fn(),
    getOrganization: jest.fn(),
    updateOrganization: jest.fn(),
    inviteMember: jest.fn(),
    listInvitations: jest.fn(),
    revokeInvitation: jest.fn(),
    getAuditLogs: jest.fn(),
  };
  const mockPurgeService = {
    purgeOrganization: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrganizationsController],
      providers: [
        { provide: AdminOrganizationsService, useValue: mockService },
        {
          provide: require('./purge-organization.service')
            .PurgeOrganizationService,
          useValue: mockPurgeService,
        },
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

  describe('update', () => {
    it('PATCH with { hasAccess: true } calls service with (id, { hasAccess: true })', async () => {
      mockService.updateOrganization.mockResolvedValue({ success: true });

      const result = await controller.update('org_1', { hasAccess: true });

      expect(mockService.updateOrganization).toHaveBeenCalledWith('org_1', {
        hasAccess: true,
      });
      expect(result).toEqual({ success: true });
    });

    it('PATCH with { hasAccess: false } calls service with (id, { hasAccess: false })', async () => {
      mockService.updateOrganization.mockResolvedValue({ success: true });

      const result = await controller.update('org_1', { hasAccess: false });

      expect(mockService.updateOrganization).toHaveBeenCalledWith('org_1', {
        hasAccess: false,
      });
      expect(result).toEqual({ success: true });
    });

    it('PATCH with { backgroundCheckStepEnabled: false } calls service with correct body', async () => {
      mockService.updateOrganization.mockResolvedValue({ success: true });

      const result = await controller.update('org_1', {
        backgroundCheckStepEnabled: false,
      });

      expect(mockService.updateOrganization).toHaveBeenCalledWith('org_1', {
        backgroundCheckStepEnabled: false,
      });
      expect(result).toEqual({ success: true });
    });

    it('PATCH with multiple fields passes both through', async () => {
      mockService.updateOrganization.mockResolvedValue({ success: true });

      const result = await controller.update('org_1', {
        hasAccess: true,
        backgroundCheckStepEnabled: false,
      });

      expect(mockService.updateOrganization).toHaveBeenCalledWith('org_1', {
        hasAccess: true,
        backgroundCheckStepEnabled: false,
      });
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

  describe('purge', () => {
    it('should call purge service with confirm, id, and acting user', async () => {
      mockPurgeService.purgeOrganization.mockResolvedValue({
        success: true,
        organizationId: 'org_1',
      });

      const result = await controller.purge(
        'org_1',
        { userId: 'usr_admin' } as { userId: string },
        { confirm: 'acme' },
      );

      expect(mockPurgeService.purgeOrganization).toHaveBeenCalledWith({
        organizationId: 'org_1',
        confirm: 'acme',
        adminUserId: 'usr_admin',
      });
      expect(result).toEqual({ success: true, organizationId: 'org_1' });
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
