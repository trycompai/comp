import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { ActingUserResolver } from '../auth/acting-user.service';
import type { AuthContext, AuthenticatedRequest } from '../auth/types';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    vendor: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

// The controller graph imports @db (Prisma client + many enums referenced by the
// vendor DTOs' @ApiProperty decorators). Mock it so the real Prisma client isn't
// constructed at load. Any enum member access (e.g. VendorCategory.other,
// RiskTreatmentType.accept) returns the member name as its value, so we don't
// have to enumerate every enum. Service + resolver are mocked providers, so `db`
// itself is never queried.
jest.mock('@db', () => {
  const enumStub = new Proxy(
    {},
    { get: (_target, prop) => (typeof prop === 'string' ? prop : undefined) },
  );
  const known: Record<string, unknown> = { __esModule: true, db: {}, Prisma: {} };
  return new Proxy(known, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      return prop in target ? target[prop] : enumStub;
    },
  });
});

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

  const mockActingUser = { resolve: jest.fn() };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  // The resolver reads off the request; it's mocked here, so a minimal shape
  // is enough. Session requests carry userId; API-key requests don't.
  const sessionReq = { userId: 'usr_123' } as unknown as AuthenticatedRequest;
  const apiKeyReq = { isApiKey: true } as unknown as AuthenticatedRequest;

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
        { provide: ActingUserResolver, useValue: mockActingUser },
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
    // Default: session caller resolves to their own user.
    mockActingUser.resolve.mockResolvedValue({
      userId: 'usr_123',
      memberId: 'mem_123',
      source: 'session',
    });
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

      const result = await controller.getAllVendors(
        'org_123',
        apiKeyAuthContext,
      );

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
      const createdVendor = {
        id: 'vnd_new',
        name: 'New Vendor',
        category: 'SaaS',
      };
      mockVendorsService.create.mockResolvedValue(createdVendor);

      const result = await controller.createVendor(
        dto as any,
        'org_123',
        mockAuthContext,
        sessionReq,
      );

      expect(result).toMatchObject(createdVendor);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_123',
        email: 'test@example.com',
      });
      // Session caller: create is attributed to the resolved (session) user.
      expect(vendorsService.create).toHaveBeenCalledWith(
        'org_123',
        dto,
        'usr_123',
      );
    });

    it('attributes API-key creates to the resolved actor (key creator / owner)', async () => {
      const dto = { name: 'New Vendor' };
      const createdVendor = { id: 'vnd_new', name: 'New Vendor' };
      mockVendorsService.create.mockResolvedValue(createdVendor);
      // API-key caller has no session userId; the resolver supplies the
      // responsible user so the auto-created assessment task is attributed to
      // a real person instead of falling back to the org owner downstream.
      mockActingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_creator',
        memberId: 'mem_creator',
        source: 'api-key-creator',
      });

      const result = await controller.createVendor(
        dto as any,
        'org_123',
        apiKeyAuthContext,
        apiKeyReq,
      );

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
      expect(vendorsService.create).toHaveBeenCalledWith(
        'org_123',
        dto,
        'usr_creator',
      );
    });

    it('passes undefined userId when no actor can be resolved', async () => {
      const dto = { name: 'New Vendor' };
      mockVendorsService.create.mockResolvedValue({ id: 'vnd_new' });
      mockActingUser.resolve.mockResolvedValueOnce({
        userId: null,
        source: 'org-owner-fallback',
      });

      await controller.createVendor(
        dto as any,
        'org_123',
        apiKeyAuthContext,
        apiKeyReq,
      );

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
        sessionReq,
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

    it('attributes API-key triggers to the resolved actor', async () => {
      mockVendorsService.triggerAssessment.mockResolvedValue({
        status: 'pending',
      });
      mockActingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_owner',
        memberId: 'mem_owner',
        source: 'org-owner-fallback',
      });

      await controller.triggerAssessment('vnd_1', 'org_123', apiKeyReq);

      expect(vendorsService.triggerAssessment).toHaveBeenCalledWith(
        'vnd_1',
        'org_123',
        'usr_owner',
      );
    });

    it('passes undefined userId when no actor can be resolved', async () => {
      mockVendorsService.triggerAssessment.mockResolvedValue({
        status: 'pending',
      });
      mockActingUser.resolve.mockResolvedValueOnce({
        userId: null,
        source: 'org-owner-fallback',
      });

      await controller.triggerAssessment('vnd_1', 'org_123', apiKeyReq);

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
