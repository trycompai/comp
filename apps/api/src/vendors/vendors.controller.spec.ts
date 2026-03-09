import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    vendor: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

describe('VendorsController', () => {
  let controller: VendorsController;
  let vendorsService: jest.Mocked<VendorsService>;

  const mockVendorsService = {
    searchGlobal: jest.fn(),
    findAllByOrganization: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    triggerAssessment: jest.fn(),
    deleteById: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['owner'],
  };

  const apiKeyAuthContext: AuthContext = {
    ...mockAuthContext,
    userId: undefined,
    userEmail: undefined,
    authType: 'api-key',
    isApiKey: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        { provide: VendorsService, useValue: mockVendorsService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<VendorsController>(VendorsController);
    vendorsService = module.get(VendorsService);

    jest.clearAllMocks();
  });

  describe('searchGlobalVendors', () => {
    it('should search global vendors with provided name', async () => {
      const mockResults = [
        { id: 'gv_1', name: 'Acme Corp' },
        { id: 'gv_2', name: 'Acme Inc' },
      ];
      mockVendorsService.searchGlobal.mockResolvedValue(mockResults);

      const result = await controller.searchGlobalVendors('Acme');

      expect(result).toEqual(mockResults);
      expect(vendorsService.searchGlobal).toHaveBeenCalledWith('Acme');
    });

    it('should default to empty string when name is undefined', async () => {
      mockVendorsService.searchGlobal.mockResolvedValue([]);

      const result = await controller.searchGlobalVendors(undefined);

      expect(result).toEqual([]);
      expect(vendorsService.searchGlobal).toHaveBeenCalledWith('');
    });
  });

  describe('getAllVendors', () => {
    it('should return vendors with auth context', async () => {
      const mockVendors = [
        { id: 'vnd_1', name: 'Vendor A' },
        { id: 'vnd_2', name: 'Vendor B' },
      ];
      mockVendorsService.findAllByOrganization.mockResolvedValue(mockVendors);

      const result = await controller.getAllVendors('org_123', mockAuthContext);

      expect(result.data).toEqual(mockVendors);
      expect(result.count).toBe(2);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(vendorsService.findAllByOrganization).toHaveBeenCalledWith(
        'org_123',
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      mockVendorsService.findAllByOrganization.mockResolvedValue([]);

      const result = await controller.getAllVendors('org_123', apiKeyAuthContext);

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getVendorById', () => {
    it('should return a single vendor with auth context', async () => {
      const mockVendor = { id: 'vnd_1', name: 'Vendor A', status: 'active' };
      mockVendorsService.findById.mockResolvedValue(mockVendor);

      const result = await controller.getVendorById(
        'vnd_1',
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(mockVendor);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(vendorsService.findById).toHaveBeenCalledWith('vnd_1', 'org_123');
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const mockVendor = { id: 'vnd_1', name: 'Vendor A' };
      mockVendorsService.findById.mockResolvedValue(mockVendor);

      const result = await controller.getVendorById(
        'vnd_1',
        'org_123',
        apiKeyAuthContext,
      );

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
    });
  });

  describe('createVendor', () => {
    it('should create a vendor and return with auth context', async () => {
      const dto = { name: 'New Vendor', category: 'SaaS' };
      const createdVendor = { id: 'vnd_new', name: 'New Vendor', category: 'SaaS' };
      mockVendorsService.create.mockResolvedValue(createdVendor);

      const result = await controller.createVendor(
        dto as any,
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(createdVendor);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(vendorsService.create).toHaveBeenCalledWith(
        'org_123',
        dto,
        'usr_123',
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const dto = { name: 'New Vendor' };
      const createdVendor = { id: 'vnd_new', name: 'New Vendor' };
      mockVendorsService.create.mockResolvedValue(createdVendor);

      const result = await controller.createVendor(
        dto as any,
        'org_123',
        apiKeyAuthContext,
      );

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
      expect(vendorsService.create).toHaveBeenCalledWith(
        'org_123',
        dto,
        undefined,
      );
    });
  });

  describe('updateVendor', () => {
    it('should update a vendor and return with auth context', async () => {
      const dto = { name: 'Updated Vendor' };
      const updatedVendor = { id: 'vnd_1', name: 'Updated Vendor' };
      mockVendorsService.updateById.mockResolvedValue(updatedVendor);

      const result = await controller.updateVendor(
        'vnd_1',
        dto as any,
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(updatedVendor);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(vendorsService.updateById).toHaveBeenCalledWith(
        'vnd_1',
        'org_123',
        dto,
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const dto = { name: 'Updated Vendor' };
      const updatedVendor = { id: 'vnd_1', name: 'Updated Vendor' };
      mockVendorsService.updateById.mockResolvedValue(updatedVendor);

      const result = await controller.updateVendor(
        'vnd_1',
        dto as any,
        'org_123',
        apiKeyAuthContext,
      );

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
    });
  });

  describe('triggerAssessment', () => {
    it('should trigger assessment and return success with result', async () => {
      const assessmentResult = { assessmentId: 'asmt_1', status: 'pending' };
      mockVendorsService.triggerAssessment.mockResolvedValue(assessmentResult);

      const result = await controller.triggerAssessment(
        'vnd_1',
        'org_123',
        mockAuthContext,
      );

      expect(result).toEqual({
        success: true,
        ...assessmentResult,
      });
      expect(vendorsService.triggerAssessment).toHaveBeenCalledWith(
        'vnd_1',
        'org_123',
        'usr_123',
      );
    });

    it('should pass undefined userId when auth context has no userId', async () => {
      mockVendorsService.triggerAssessment.mockResolvedValue({ status: 'pending' });

      await controller.triggerAssessment('vnd_1', 'org_123', apiKeyAuthContext);

      expect(vendorsService.triggerAssessment).toHaveBeenCalledWith(
        'vnd_1',
        'org_123',
        undefined,
      );
    });
  });

  describe('deleteVendor', () => {
    it('should delete a vendor and return with auth context', async () => {
      const deleteResult = { success: true, id: 'vnd_1' };
      mockVendorsService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteVendor(
        'vnd_1',
        'org_123',
        mockAuthContext,
      );

      expect(result).toMatchObject(deleteResult);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      expect(vendorsService.deleteById).toHaveBeenCalledWith(
        'vnd_1',
        'org_123',
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const deleteResult = { success: true, id: 'vnd_1' };
      mockVendorsService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteVendor(
        'vnd_1',
        'org_123',
        apiKeyAuthContext,
      );

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
    });
  });
});
