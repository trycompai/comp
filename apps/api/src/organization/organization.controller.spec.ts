import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { ApiKeyService } from '../auth/api-key.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    organization: ['read', 'update', 'delete'],
    member: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('OrganizationController', () => {
  let controller: OrganizationController;

  const mockOrganizationService = {
    findById: jest.fn(),
    getLogoSignedUrl: jest.fn(),
    getOwnershipData: jest.fn(),
    updateRoleNotifications: jest.fn(),
    findOnboarding: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    transferOwnership: jest.fn(),
    getPrimaryColor: jest.fn(),
    uploadLogo: jest.fn(),
    removeLogo: jest.fn(),
    listApiKeys: jest.fn(),
    getRoleNotificationSettings: jest.fn(),
  };

  const mockApiKeyService = {
    getAvailableScopes: jest.fn(),
    create: jest.fn(),
    revoke: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const sessionAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['owner'],
  };

  const apiKeyAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'api-key',
    isApiKey: true,
    isPlatformAdmin: false,
    userId: undefined,
    userEmail: undefined,
    userRoles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: ApiKeyService, useValue: mockApiKeyService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OrganizationController>(OrganizationController);

    jest.clearAllMocks();
  });

  describe('getOrganization', () => {
    const mockOrg = { id: 'org_123', name: 'Test Org', logo: 'logo.png' };
    const mockLogoUrl = 'https://s3.example.com/logo.png';

    beforeEach(() => {
      mockOrganizationService.findById.mockResolvedValue(mockOrg);
      mockOrganizationService.getLogoSignedUrl.mockResolvedValue(mockLogoUrl);
    });

    it('should return org with authenticatedUser for session auth', async () => {
      const result = await controller.getOrganization(
        'org_123',
        sessionAuthContext,
      );

      expect(result).toMatchObject({
        ...mockOrg,
        logoUrl: mockLogoUrl,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
      expect(mockOrganizationService.findById).toHaveBeenCalledWith('org_123');
    });

    it('should return org without authenticatedUser for API key auth', async () => {
      const result = await controller.getOrganization(
        'org_123',
        apiKeyAuthContext,
      );

      expect(result.authType).toBe('api-key');
      expect(result.authenticatedUser).toBeUndefined();
    });

    it('should include ownership data when includeOwnership=true and session auth', async () => {
      const ownershipData = {
        isOwner: true,
        eligibleMembers: [{ id: 'mem_1', name: 'Alice' }],
      };
      mockOrganizationService.getOwnershipData.mockResolvedValue(ownershipData);

      const result = await controller.getOrganization(
        'org_123',
        sessionAuthContext,
        'true',
      );

      expect(result.isOwner).toBe(true);
      expect(result.eligibleMembers).toEqual(ownershipData.eligibleMembers);
      expect(mockOrganizationService.getOwnershipData).toHaveBeenCalledWith(
        'org_123',
        'usr_123',
      );
    });

    it('should not include ownership data for API key auth even when includeOwnership=true', async () => {
      const result = await controller.getOrganization(
        'org_123',
        apiKeyAuthContext,
        'true',
      );

      expect(result.isOwner).toBeUndefined();
      expect(result.eligibleMembers).toBeUndefined();
      expect(mockOrganizationService.getOwnershipData).not.toHaveBeenCalled();
    });

    it('should not include ownership data when includeOwnership is not "true"', async () => {
      const result = await controller.getOrganization(
        'org_123',
        sessionAuthContext,
        'false',
      );

      expect(result.isOwner).toBeUndefined();
      expect(mockOrganizationService.getOwnershipData).not.toHaveBeenCalled();
    });
  });

  describe('updateRoleNotifications', () => {
    const validSettings = [
      {
        role: 'admin',
        policyNotifications: true,
        taskReminders: true,
        taskAssignments: true,
        taskMentions: true,
        weeklyTaskDigest: false,
        findingNotifications: true,
      },
    ];

    it('should pass valid settings to service', async () => {
      mockOrganizationService.updateRoleNotifications.mockResolvedValue({
        success: true,
      });

      const result = await controller.updateRoleNotifications('org_123', {
        settings: validSettings,
      });

      expect(result).toEqual({ success: true });
      expect(
        mockOrganizationService.updateRoleNotifications,
      ).toHaveBeenCalledWith('org_123', validSettings);
    });

    it('should throw BadRequestException with empty body', async () => {
      await expect(
        controller.updateRoleNotifications(
          'org_123',
          {} as { settings: never[] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with null settings', async () => {
      await expect(
        controller.updateRoleNotifications('org_123', {
          settings: null as unknown as never[],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with non-array settings', async () => {
      await expect(
        controller.updateRoleNotifications('org_123', {
          settings: 'not-an-array' as unknown as never[],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw with message about settings being required', async () => {
      await expect(
        controller.updateRoleNotifications(
          'org_123',
          {} as { settings: never[] },
        ),
      ).rejects.toThrow('settings is required and must be an array');
    });
  });
});
