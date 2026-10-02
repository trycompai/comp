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

    jest.clearAllMocks();
  });

  describe('createAccessRequest', () => {
    it('should call mockService.createAccessRequest with correct params', async () => {
      const dto = { email: 'user@example.com', company: 'Acme' } as any;
      const req = mockRequest();
      mockService.createAccessRequest.mockResolvedValue({ id: 'req_1' });

      const result = await controller.createAccessRequest(
        'my-portal',
        dto,
        req,
      );

      expect(result).toEqual({ id: 'req_1' });
      expect(mockService.createAccessRequest).toHaveBeenCalledWith(
        'my-portal',
        dto,
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('listAccessRequests', () => {
    it('should call mockService.listAccessRequests with organizationId and dto', async () => {
      const dto = { status: 'pending' } as any;
      const mockResult = { data: [{ id: 'req_1' }], count: 1 };
      mockService.listAccessRequests.mockResolvedValue(mockResult);

      const result = await controller.listAccessRequests(orgId, dto);

      expect(result).toEqual(mockResult);
      expect(mockService.listAccessRequests).toHaveBeenCalledWith(orgId, dto);
    });
  });

  describe('getAccessRequest', () => {
    it('should call mockService.getAccessRequest with organizationId and requestId', async () => {
      const mockResult = { id: 'req_1', email: 'user@example.com' };
      mockService.getAccessRequest.mockResolvedValue(mockResult);

      const result = await controller.getAccessRequest(orgId, 'req_1');

      expect(result).toEqual(mockResult);
      expect(mockService.getAccessRequest).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('approveRequest', () => {
    it('should call mockService.approveRequest with correct params', async () => {
      const dto = { expiresInDays: 30 } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.approveRequest.mockResolvedValue({ success: true });

      const result = await controller.approveRequest(orgId, 'req_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(mockService.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(mockService.approveRequest).toHaveBeenCalledWith(
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
    it('should call mockService.denyRequest with correct params', async () => {
      const dto = { reason: 'Not eligible' } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.denyRequest.mockResolvedValue({ success: true });

      const result = await controller.denyRequest(orgId, 'req_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(mockService.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(mockService.denyRequest).toHaveBeenCalledWith(
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
    it('should call mockService.listGrants with organizationId', async () => {
      const mockResult = [{ id: 'grant_1' }];
      mockService.listGrants.mockResolvedValue(mockResult);

      const result = await controller.listGrants(orgId);

      expect(result).toEqual(mockResult);
      expect(mockService.listGrants).toHaveBeenCalledWith(orgId);
    });
  });

  describe('revokeGrant', () => {
    it('should call mockService.revokeGrant with correct params', async () => {
      const dto = { reason: 'Revoked' } as any;
      const req = mockRequest('user_1');
      mockService.getMemberIdFromUserId.mockResolvedValue('mem_1');
      mockService.revokeGrant.mockResolvedValue({ success: true });

      const result = await controller.revokeGrant(orgId, 'grant_1', dto, req);

      expect(result).toEqual({ success: true });
      expect(mockService.getMemberIdFromUserId).toHaveBeenCalledWith(
        'user_1',
        orgId,
      );
      expect(mockService.revokeGrant).toHaveBeenCalledWith(
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
    it('should call mockService.resendAccessGrantEmail with organizationId and grantId', async () => {
      mockService.resendAccessGrantEmail.mockResolvedValue({ success: true });

      const result = await controller.resendAccessEmail(orgId, 'grant_1');

      expect(result).toEqual({ success: true });
      expect(mockService.resendAccessGrantEmail).toHaveBeenCalledWith(
        orgId,
        'grant_1',
      );
    });
  });

  describe('getNda', () => {
    it('should call mockService.getNdaByToken with token', async () => {
      const mockResult = { id: 'nda_1', content: 'NDA content' };
      mockService.getNdaByToken.mockResolvedValue(mockResult);

      const result = await controller.getNda('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.getNdaByToken).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('previewNdaByToken', () => {
    it('should call mockService.previewNdaByToken with token', async () => {
      const mockResult = { url: 'https://preview-url' };
      mockService.previewNdaByToken.mockResolvedValue(mockResult);

      const result = await controller.previewNdaByToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.previewNdaByToken).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('signNda', () => {
    it('should call mockService.signNda with correct params when accepted', async () => {
      const dto = { accept: true, name: 'John', email: 'john@example.com' };
      const req = mockRequest();
      mockService.signNda.mockResolvedValue({ success: true });

      const result = await controller.signNda('token_abc', dto, req);

      expect(result).toEqual({ success: true });
      expect(mockService.signNda).toHaveBeenCalledWith(
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
    it('should call mockService.resendNda with organizationId and requestId', async () => {
      mockService.resendNda.mockResolvedValue({ success: true });

      const result = await controller.resendNda(orgId, 'req_1');

      expect(result).toEqual({ success: true });
      expect(mockService.resendNda).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('previewNda', () => {
    it('should call mockService.previewNda with organizationId and requestId', async () => {
      const mockResult = { url: 'https://preview-url' };
      mockService.previewNda.mockResolvedValue(mockResult);

      const result = await controller.previewNda(orgId, 'req_1');

      expect(result).toEqual(mockResult);
      expect(mockService.previewNda).toHaveBeenCalledWith(orgId, 'req_1');
    });
  });

  describe('reclaimAccess', () => {
    // GH-042: the response body is a generic message regardless of whether a
    // grant exists, so the controller test only needs to prove it forwards
    // params and returns the service's response verbatim (no accessLink or
    // token added or stripped in the controller layer).
    const GENERIC_RESPONSE = {
      message:
        'If an active access grant exists for this email, an access link will be sent.',
    };

    it('should call mockService.reclaimAccess with friendlyUrl, email, and query', async () => {
      const dto = { email: 'user@example.com' };
      mockService.reclaimAccess.mockResolvedValue(GENERIC_RESPONSE);

      const result = await controller.reclaimAccess(
        'my-portal',
        dto,
        'security-questionnaire',
      );

      expect(result).toEqual(GENERIC_RESPONSE);
      expect(result).not.toHaveProperty('accessLink');
      expect(mockService.reclaimAccess).toHaveBeenCalledWith(
        'my-portal',
        'user@example.com',
        'security-questionnaire',
      );
    });

    it('should pass undefined query when not provided', async () => {
      const dto = { email: 'user@example.com' };
      mockService.reclaimAccess.mockResolvedValue(GENERIC_RESPONSE);

      await controller.reclaimAccess('my-portal', dto);

      expect(mockService.reclaimAccess).toHaveBeenCalledWith(
        'my-portal',
        'user@example.com',
        undefined,
      );
    });

    it('returns the same generic response whether or not a grant exists (no enumeration signal)', async () => {
      const dto = { email: 'nobody@example.com' };
      mockService.reclaimAccess.mockResolvedValue(GENERIC_RESPONSE);

      const result = await controller.reclaimAccess('my-portal', dto);

      expect(result).toEqual(GENERIC_RESPONSE);
    });
  });

  describe('getGrantByAccessToken', () => {
    it('should call mockService.getGrantByAccessToken with token', async () => {
      const mockResult = { id: 'grant_1', email: 'user@example.com' };
      mockService.getGrantByAccessToken.mockResolvedValue(mockResult);

      const result = await controller.getGrantByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.getGrantByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('getPoliciesByAccessToken', () => {
    it('should call mockService.getPoliciesByAccessToken with token', async () => {
      const mockResult = [{ id: 'pol_1', name: 'Privacy Policy' }];
      mockService.getPoliciesByAccessToken.mockResolvedValue(mockResult);

      const result = await controller.getPoliciesByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.getPoliciesByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllPolicies', () => {
    it('should call mockService.downloadAllPoliciesByAccessToken with token', async () => {
      const mockResult = { url: 'https://download-url' };
      mockService.downloadAllPoliciesByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllPolicies('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.downloadAllPoliciesByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllPoliciesAsZip', () => {
    it('should call mockService.downloadAllPoliciesAsZipByAccessToken with token', async () => {
      const mockResult = { url: 'https://zip-url' };
      mockService.downloadAllPoliciesAsZipByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllPoliciesAsZip('token_abc');

      expect(result).toEqual(mockResult);
      expect(
        mockService.downloadAllPoliciesAsZipByAccessToken,
      ).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('getComplianceResourcesByAccessToken', () => {
    it('should call mockService.getComplianceResourcesByAccessToken with token', async () => {
      const mockResult = [{ id: 'cr_1' }];
      mockService.getComplianceResourcesByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result =
        await controller.getComplianceResourcesByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(
        mockService.getComplianceResourcesByAccessToken,
      ).toHaveBeenCalledWith('token_abc');
    });
  });

  describe('getTrustDocumentsByAccessToken', () => {
    it('should call mockService.getTrustDocumentsByAccessToken with token', async () => {
      const mockResult = [{ id: 'td_1' }];
      mockService.getTrustDocumentsByAccessToken.mockResolvedValue(mockResult);

      const result =
        await controller.getTrustDocumentsByAccessToken('token_abc');

      expect(result).toEqual(mockResult);
      expect(mockService.getTrustDocumentsByAccessToken).toHaveBeenCalledWith(
        'token_abc',
      );
    });
  });

  describe('downloadAllTrustDocuments', () => {
    it('should call mockService.downloadAllTrustDocumentsByAccessToken with token', async () => {
      const mockResult = { url: 'https://zip-url' };
      mockService.downloadAllTrustDocumentsByAccessToken.mockResolvedValue(
        mockResult,
      );

      const result = await controller.downloadAllTrustDocuments('token_abc');

      expect(result).toEqual(mockResult);
      expect(
        mockService.downloadAllTrustDocumentsByAccessToken,
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
      expect(mockService.getTrustDocumentUrlByAccessToken).toHaveBeenCalledWith(
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
        mockService.getComplianceResourceUrlByAccessToken,
      ).toHaveBeenCalledWith('token_abc', 'SOC2');
    });
  });

  describe('getFaqs', () => {
    it('should call mockService.getFaqs with friendlyUrl', async () => {
      const mockResult = { faqs: [{ question: 'Q1', answer: 'A1' }] };
      mockService.getFaqs.mockResolvedValue(mockResult);

      const result = await controller.getFaqs('my-portal');

      expect(result).toEqual(mockResult);
      expect(mockService.getFaqs).toHaveBeenCalledWith('my-portal');
    });
  });

  describe('getPublicOverview', () => {
    it('should call mockService.getPublicOverview with friendlyUrl', async () => {
      const mockResult = { title: 'Trust Center' };
      mockService.getPublicOverview.mockResolvedValue(mockResult);

      const result = await controller.getPublicOverview('my-portal');

      expect(result).toEqual(mockResult);
      expect(mockService.getPublicOverview).toHaveBeenCalledWith('my-portal');
    });
  });

  describe('getPublicCustomLinks', () => {
    it('should call mockService.getPublicCustomLinks with friendlyUrl', async () => {
      const mockResult = [{ id: 'cl_1', title: 'Link' }];
      mockService.getPublicCustomLinks.mockResolvedValue(mockResult);

      const result = await controller.getPublicCustomLinks('my-portal');

      expect(result).toEqual(mockResult);
      expect(mockService.getPublicCustomLinks).toHaveBeenCalledWith(
        'my-portal',
      );
    });
  });

  describe('getPublicFavicon', () => {
    it('should call mockService.getPublicFavicon and return wrapped result', async () => {
      mockService.getPublicFavicon.mockResolvedValue('https://favicon-url');

      const result = await controller.getPublicFavicon('my-portal');

      expect(result).toEqual({ faviconUrl: 'https://favicon-url' });
      expect(mockService.getPublicFavicon).toHaveBeenCalledWith('my-portal');
    });

    it('should return null faviconUrl when service returns null', async () => {
      mockService.getPublicFavicon.mockResolvedValue(null);

      const result = await controller.getPublicFavicon('my-portal');

      expect(result).toEqual({ faviconUrl: null });
    });
  });

  describe('getPublicVendors', () => {
    it('should call mockService.getPublicVendors with friendlyUrl', async () => {
      const mockResult = [{ id: 'v_1', name: 'Vendor' }];
      mockService.getPublicVendors.mockResolvedValue(mockResult);

      const result = await controller.getPublicVendors('my-portal');

      expect(result).toEqual(mockResult);
      expect(mockService.getPublicVendors).toHaveBeenCalledWith('my-portal');
    });
  });
});
