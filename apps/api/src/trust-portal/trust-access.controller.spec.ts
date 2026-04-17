import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TrustAccessController } from './trust-access.controller';
import { TrustAccessService } from './trust-access.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    trust: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('TrustAccessController', () => {
  let controller: TrustAccessController;
  let service: jest.Mocked<TrustAccessService>;

  const mockService = {
    createAccessRequest: jest.fn(),
    listAccessRequests: jest.fn(),
    getAccessRequest: jest.fn(),
    approveRequest: jest.fn(),
    denyRequest: jest.fn(),
    listGrants: jest.fn(),
    revokeGrant: jest.fn(),
    resendAccessGrantEmail: jest.fn(),
    getNdaByToken: jest.fn(),
    previewNdaByToken: jest.fn(),
    signNda: jest.fn(),
    resendNda: jest.fn(),
    previewNda: jest.fn(),
    reclaimAccess: jest.fn(),
    getGrantByAccessToken: jest.fn(),
    getPoliciesByAccessToken: jest.fn(),
    downloadAllPoliciesByAccessToken: jest.fn(),
    downloadAllPoliciesAsZipByAccessToken: jest.fn(),
    getComplianceResourcesByAccessToken: jest.fn(),
    getTrustDocumentsByAccessToken: jest.fn(),
    downloadAllTrustDocumentsByAccessToken: jest.fn(),
    getTrustDocumentUrlByAccessToken: jest.fn(),
    getComplianceResourceUrlByAccessToken: jest.fn(),
    getFaqs: jest.fn(),
    getPublicOverview: jest.fn(),
    getPublicCustomLinks: jest.fn(),
    getPublicFavicon: jest.fn(),
    getPublicVendors: jest.fn(),
    getMemberIdFromUserId: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const orgId = 'org_test123';

  const mockRequest = (userId?: string) =>
    ({
      userId,
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'test-agent' },
    }) as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrustAccessController],
      providers: [{ provide: TrustAccessService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TrustAccessController>(TrustAccessController);
    service = module.get(TrustAccessService);

    jest.clearAllMocks();
  });

  describe('createAccessRequest', () => {
    it('should call service.createAccessRequest with correct params', async () => {
      const dto = { email: 'user@example.com', company: 'Acme' } as any;
      const req = mockRequest();
      mockService.createAccessRequest.mockResolvedValue({ id: 'req_1' });

      const result = await controller.createAccessRequest(
        'my-portal',
        dto,
        req,
      );

      expect(result).toEqual({ id: 'req_1' });
      expect(service.createAccessRequest).toHaveBeenCalledWith(
        'my-portal',
        dto,
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('listAccessRequests', () => {
    it('should call service.listAccessRequests with organizationId and dto', async () => {
      const dto = { status: 'pending' } as any;
      const mockResult = { data: [{ id: 'req_1' }], count: 1 };
      mockService.listAccessRequests.mockResolvedValue(mockResult);

      const result = await controller.listAccessRequests(orgId, dto);

      expect(result).toEqual(mockResult);
      expect(service.listAccessRequests).toHaveBeenCalledWith(orgId, dto);
    });
  });

  describe('getAccessRequest', () => {
    it('should call service.getAccessRequest with organizationId and requestId', async () => {
      const mockResult = { id: 'req_1', email: 'user@example.com' };
      mockService.getAccessRequest.mockResolvedValue(mockResult);

      const result = await controller.getAccessRequest(orgId, 'req_1');

      expect(result).toEqual(mockResult);
      expect(service.getAccessRequest).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('approveRequest', () => {
    it('should call service.approveRequest with correct params', async () => {
      const dto = { expiresInDays: 30 } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.approveRequest.mockResolvedValue({ success: true });

      const result = await controller.approveRequest(orgId, 'req_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(service.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(service.approveRequest).toHaveBeenCalledWith(
        orgId,
        'req_1',
        dto,
        'mem_1',
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      const dto = { expiresInDays: 30 } as any;
      const req = mockRequest(undefined);

      await expect(
        controller.approveRequest(orgId, 'req_1', dto, req),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('denyRequest', () => {
    it('should call service.denyRequest with correct params', async () => {
      const dto = { reason: 'Not eligible' } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.denyRequest.mockResolvedValue({ success: true });

      const result = await controller.denyRequest(orgId, 'req_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(service.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(service.denyRequest).toHaveBeenCalledWith(
        orgId,
        'req_1',
        dto,
        'mem_1',
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      const dto = { reason: 'test' } as any;
      const req = mockRequest(undefined);

      await expect(
        controller.denyRequest(orgId, 'req_1', dto, req),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('listGrants', () => {
    it('should call service.listGrants with organizationId', async () => {
      const mockResult = [{ id: 'grant_1' }];
      mockService.listGrants.mockResolvedValue(mockResult);

      const result = await controller.listGrants(orgId);

      expect(result).toEqual(mockResult);
      expect(service.listGrants).toHaveBeenCalledWith(orgId);
    });
  });

  describe('revokeGrant', () => {
    it('should call service.revokeGrant with correct params', async () => {
      const dto = { reason: 'Revoked' } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.revokeGrant.mockResolvedValue({ success: true });

      const result = await controller.revokeGrant(orgId, 'grant_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(service.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(service.revokeGrant).toHaveBeenCalledWith(
        orgId,
        'grant_1',
        dto,
        'mem_1',
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      const dto = { reason: 'test' } as any;
      const req = mockRequest(undefined);

      await expect(
        controller.revokeGrant(orgId, 'grant_1', dto, req),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resendAccessEmail', () => {
    it('should call service.resendAccessGrantEmail with organizationId and grantId', async () => {
      mockService.resendAccessGrantEmail.mockResolvedValue({ success: true });

      const result = await controller.resendAccessEmail(orgId, 'grant_1');

      expect(result).toEqual({ success: true });
      expect(service.resendAccessGrantEmail).toHaveBeenCalledWith(
        orgId,
        'grant_1',
      );
    });
  });

  describe('getNda', () => {
    it('should call service.getNdaByToken with token', async () => {
      const mockResult = { id: 'nda_1', content: 'NDA content' };
      mockService.getNdaByToken.mockResolvedValue(mockResult);

      const result = await controller.getNda('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.getNdaByToken).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('previewNdaByToken', () => {
    it('should call service.previewNdaByToken with token', async () => {
      const mockResult = { url: 'https://preview-url' };
      mockService.previewNdaByToken.mockResolvedValue(mockResult);

      const result = await controller.previewNdaByToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.previewNdaByToken).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('signNda', () => {
    it('should call service.signNda with correct params when accepted', async () => {
      const dto = { accept: true, name: 'John', email: 'john@example.com' };
      const req = mockRequest();
      mockService.signNda.mockResolvedValue({ success: true });

      const result = await controller.signNda('token_abc', dto as any, req);

      expect(result).toEqual({ success: true });
      expect(service.signNda).toHaveBeenCalledWith(
        'token_abc',
        'John',
        'john@example.com',
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should throw error when accept is false', async () => {
      const dto = { accept: false, name: 'John', email: 'john@example.com' };
      const req = mockRequest();

      await expect(
        controller.signNda('token_abc', dto as any, req),
      ).rejects.toThrow('You must accept the NDA to proceed');
    });
  });

  describe('resendNda', () => {
    it('should call service.resendNda with organizationId and requestId', async () => {
      mockService.resendNda.mockResolvedValue({ success: true });

      const result = await controller.resendNda(orgId, 'req_1');

      expect(result).toEqual({ success: true });
      expect(service.resendNda).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('previewNda', () => {
    it('should call service.previewNda with organizationId and requestId', async () => {
      const mockResult = { url: 'https://preview-url' };
      mockService.previewNda.mockResolvedValue(mockResult);

      const result = await controller.previewNda(orgId, 'req_1');

      expect(result).toEqual(mockResult);
      expect(service.previewNda).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('reclaimAccess', () => {
    it('should call service.reclaimAccess with friendlyUrl, email, and query', async () => {
      const dto = { email: 'user@example.com' };
      mockService.reclaimAccess.mockResolvedValue({ success: true });

      const result = await controller.reclaimAccess(
        'my-portal',
        dto as any,
        'security-questionnaire',
      );

      expect(result).toEqual({ success: true });
      expect(service.reclaimAccess).toHaveBeenCalledWith(
        'my-portal',
        'user@example.com',
        'security-questionnaire',
      );
    });

    it('should pass undefined query when not provided', async () => {
      const dto = { email: 'user@example.com' };
      mockService.reclaimAccess.mockResolvedValue({ success: true });

      await controller.reclaimAccess('my-portal', dto as any);

      expect(service.reclaimAccess).toHaveBeenCalledWith(
        'my-portal',
        'user@example.com',
        undefined,
      );
    });
  });

  describe('getGrantByAccessToken', () => {
    it('should call service.getGrantByAccessToken with token', async () => {
      const mockResult = { id: 'grant_1', email: 'user@example.com' };
      mockService.getGrantByAccessToken.mockResolvedValue(mockResult);

      const result = await controller.getGrantByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.getGrantByAccessToken).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('getPoliciesByAccessToken', () => {
    it('should call service.getPoliciesByAccessToken with token', async () => {
      const mockResult = [{ id: 'pol_1', name: 'Privacy Policy' }];
      mockService.getPoliciesByAccessToken.mockResolvedValue(mockResult);

      const result = await controller.getPoliciesByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.getPoliciesByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllPolicies', () => {
    it('should call service.downloadAllPoliciesByAccessToken with token', async () => {
      const mockResult = { url: 'https://download-url' };
      mockService.downloadAllPoliciesByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllPolicies('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.downloadAllPoliciesByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllPoliciesAsZip', () => {
    it('should call service.downloadAllPoliciesAsZipByAccessToken with token', async () => {
      const mockResult = { url: 'https://zip-url' };
      mockService.downloadAllPoliciesAsZipByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllPoliciesAsZip('token_abc');

      expect(result).toEqual(mockResult);
      expect(
        service.downloadAllPoliciesAsZipByAccessToken,
      ).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('getComplianceResourcesByAccessToken', () => {
    it('should call service.getComplianceResourcesByAccessToken with token', async () => {
      const mockResult = [{ id: 'cr_1' }];
      mockService.getComplianceResourcesByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result =
        await controller.getComplianceResourcesByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.getComplianceResourcesByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('getTrustDocumentsByAccessToken', () => {
    it('should call service.getTrustDocumentsByAccessToken with token', async () => {
      const mockResult = [{ id: 'td_1' }];
      mockService.getTrustDocumentsByAccessToken.mockResolvedValue(mockResult);

      const result =
        await controller.getTrustDocumentsByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(service.getTrustDocumentsByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllTrustDocuments', () => {
    it('should call service.downloadAllTrustDocumentsByAccessToken with token', async () => {
      const mockResult = { url: 'https://zip-url' };
      mockService.downloadAllTrustDocumentsByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllTrustDocuments('token_abc');

      expect(result).toEqual(mockResult);
      expect(
        service.downloadAllTrustDocumentsByAccessToken,
      ).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('getTrustDocumentUrlByAccessToken', () => {
    it('should call service with token and documentId', async () => {
      const mockResult = { url: 'https://signed-url' };
      mockService.getTrustDocumentUrlByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.getTrustDocumentUrlByAccessToken(
        'token_abc',
        'tdoc_1',
      );

      expect(result).toEqual(mockResult);
      expect(service.getTrustDocumentUrlByAccessToken).toHaveBeenCalledWith(
        'token_abc',
        'tdoc_1',
      );
    });
  });

  describe('getComplianceResourceUrlByAccessToken', () => {
    it('should call service with token and framework', async () => {
      const mockResult = { url: 'https://signed-url' };
      mockService.getComplianceResourceUrlByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.getComplianceResourceUrlByAccessToken(
        'token_abc',
        'SOC2',
      );

      expect(result).toEqual(mockResult);
      expect(
        service.getComplianceResourceUrlByAccessToken,
      ).toHaveBeenCalledWith('token_abc', 'SOC2');
    });
  });

  describe('getFaqs', () => {
    it('should call service.getFaqs with friendlyUrl', async () => {
      const mockResult = { faqs: [{ question: 'Q1', answer: 'A1' }] };
      mockService.getFaqs.mockResolvedValue(mockResult);

      const result = await controller.getFaqs('my-portal');

      expect(result).toEqual(mockResult);
      expect(service.getFaqs).toHaveBeenCalledWith('my-portal');
    });
  });

  describe('getPublicOverview', () => {
    it('should call service.getPublicOverview with friendlyUrl', async () => {
      const mockResult = { title: 'Trust Center' };
      mockService.getPublicOverview.mockResolvedValue(mockResult);

      const result = await controller.getPublicOverview('my-portal');

      expect(result).toEqual(mockResult);
      expect(service.getPublicOverview).toHaveBeenCalledWith('my-portal');
    });
  });

  describe('getPublicCustomLinks', () => {
    it('should call service.getPublicCustomLinks with friendlyUrl', async () => {
      const mockResult = [{ id: 'cl_1', title: 'Link' }];
      mockService.getPublicCustomLinks.mockResolvedValue(mockResult);

      const result = await controller.getPublicCustomLinks('my-portal');

      expect(result).toEqual(mockResult);
      expect(service.getPublicCustomLinks).toHaveBeenCalledWith('my-portal');
    });
  });

  describe('getPublicFavicon', () => {
    it('should call service.getPublicFavicon and return wrapped result', async () => {
      mockService.getPublicFavicon.mockResolvedValue('https://favicon-url');

      const result = await controller.getPublicFavicon('my-portal');

      expect(result).toEqual({ faviconUrl: 'https://favicon-url' });
      expect(service.getPublicFavicon).toHaveBeenCalledWith('my-portal');
    });

    it('should return null faviconUrl when service returns null', async () => {
      mockService.getPublicFavicon.mockResolvedValue(null);

      const result = await controller.getPublicFavicon('my-portal');

      expect(result).toEqual({ faviconUrl: null });
    });
  });

  describe('getPublicVendors', () => {
    it('should call service.getPublicVendors with friendlyUrl', async () => {
      const mockResult = [{ id: 'v_1', name: 'Vendor' }];
      mockService.getPublicVendors.mockResolvedValue(mockResult);

      const result = await controller.getPublicVendors('my-portal');

      expect(result).toEqual(mockResult);
      expect(service.getPublicVendors).toHaveBeenCalledWith('my-portal');
    });
  });
});
