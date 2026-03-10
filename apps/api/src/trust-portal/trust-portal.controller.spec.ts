import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TrustPortalController } from './trust-portal.controller';
import { TrustPortalService } from './trust-portal.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    trust: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('TrustPortalController', () => {
  let controller: TrustPortalController;
  let service: jest.Mocked<TrustPortalService>;

  const mockService = {
    getSettings: jest.fn(),
    uploadFavicon: jest.fn(),
    removeFavicon: jest.fn(),
    getDomainStatus: jest.fn(),
    uploadComplianceResource: jest.fn(),
    getComplianceResourceUrl: jest.fn(),
    listComplianceResources: jest.fn(),
    uploadTrustDocument: jest.fn(),
    listTrustDocuments: jest.fn(),
    getTrustDocumentUrl: jest.fn(),
    deleteTrustDocument: jest.fn(),
    togglePortal: jest.fn(),
    addCustomDomain: jest.fn(),
    checkDnsRecords: jest.fn(),
    updateFaqs: jest.fn(),
    updateAllowedDomains: jest.fn(),
    updateFrameworks: jest.fn(),
    updateOverview: jest.fn(),
    getOverview: jest.fn(),
    createCustomLink: jest.fn(),
    updateCustomLink: jest.fn(),
    deleteCustomLink: jest.fn(),
    reorderCustomLinks: jest.fn(),
    listCustomLinks: jest.fn(),
    updateVendorTrustSettings: jest.fn(),
    getPublicVendors: jest.fn(),
    getAllVendorsWithSync: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const orgId = 'org_test123';
  const authContext: AuthContextType = {
    organizationId: orgId,
    userId: 'user_1',
    memberId: 'mem_1',
    role: 'admin',
    permissions: {},
    authType: 'session',
  } as unknown as AuthContextType;

  const otherOrgAuthContext: AuthContextType = {
    ...authContext,
    organizationId: 'org_other',
  } as unknown as AuthContextType;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrustPortalController],
      providers: [{ provide: TrustPortalService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TrustPortalController>(TrustPortalController);
    service = module.get(TrustPortalService);

    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should call service.getSettings with organizationId', async () => {
      const mockResult = { enabled: true };
      mockService.getSettings.mockResolvedValue(mockResult);

      const result = await controller.getSettings(orgId);

      expect(result).toEqual(mockResult);
      expect(service.getSettings).toHaveBeenCalledWith(orgId);
    });
  });

  describe('uploadFavicon', () => {
    it('should call service.uploadFavicon with organizationId and body', async () => {
      const body = { fileName: 'fav.png', fileType: 'image/png', fileData: 'base64data' };
      const mockResult = { url: 'https://example.com/fav.png' };
      mockService.uploadFavicon.mockResolvedValue(mockResult);

      const result = await controller.uploadFavicon(orgId, body);

      expect(result).toEqual(mockResult);
      expect(service.uploadFavicon).toHaveBeenCalledWith(orgId, body);
    });
  });

  describe('removeFavicon', () => {
    it('should call service.removeFavicon with organizationId', async () => {
      mockService.removeFavicon.mockResolvedValue({ success: true });

      const result = await controller.removeFavicon(orgId);

      expect(result).toEqual({ success: true });
      expect(service.removeFavicon).toHaveBeenCalledWith(orgId);
    });
  });

  describe('getDomainStatus', () => {
    it('should call service.getDomainStatus with dto', async () => {
      const dto = { domain: 'portal.example.com' };
      const mockResult = { verified: true };
      mockService.getDomainStatus.mockResolvedValue(mockResult);

      const result = await controller.getDomainStatus(dto as any);

      expect(result).toEqual(mockResult);
      expect(service.getDomainStatus).toHaveBeenCalledWith(dto);
    });
  });

  describe('uploadComplianceResource', () => {
    it('should call service.uploadComplianceResource with dto', async () => {
      const dto = { organizationId: orgId, framework: 'SOC2' } as any;
      const mockResult = { id: 'cr_1' };
      mockService.uploadComplianceResource.mockResolvedValue(mockResult);

      const result = await controller.uploadComplianceResource(dto, authContext);

      expect(result).toEqual(mockResult);
      expect(service.uploadComplianceResource).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.uploadComplianceResource(dto, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getComplianceResourceUrl', () => {
    it('should call service.getComplianceResourceUrl with dto', async () => {
      const dto = { organizationId: orgId, framework: 'SOC2' } as any;
      const mockResult = { url: 'https://signed-url' };
      mockService.getComplianceResourceUrl.mockResolvedValue(mockResult);

      const result = await controller.getComplianceResourceUrl(dto, authContext);

      expect(result).toEqual(mockResult);
      expect(service.getComplianceResourceUrl).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.getComplianceResourceUrl(dto, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listComplianceResources', () => {
    it('should call service.listComplianceResources with organizationId', async () => {
      const dto = { organizationId: orgId };
      const mockResult = [{ id: 'cr_1' }];
      mockService.listComplianceResources.mockResolvedValue(mockResult);

      const result = await controller.listComplianceResources(dto as any, authContext);

      expect(result).toEqual(mockResult);
      expect(service.listComplianceResources).toHaveBeenCalledWith(orgId);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.listComplianceResources(dto, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadTrustDocument', () => {
    it('should call service.uploadTrustDocument with dto', async () => {
      const dto = { organizationId: orgId, name: 'doc.pdf' } as any;
      const mockResult = { id: 'td_1' };
      mockService.uploadTrustDocument.mockResolvedValue(mockResult);

      const result = await controller.uploadTrustDocument(dto, authContext);

      expect(result).toEqual(mockResult);
      expect(service.uploadTrustDocument).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.uploadTrustDocument(dto, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listTrustDocuments', () => {
    it('should call service.listTrustDocuments with organizationId', async () => {
      const dto = { organizationId: orgId };
      const mockResult = [{ id: 'td_1' }];
      mockService.listTrustDocuments.mockResolvedValue(mockResult);

      const result = await controller.listTrustDocuments(dto as any, authContext);

      expect(result).toEqual(mockResult);
      expect(service.listTrustDocuments).toHaveBeenCalledWith(orgId);
    });
  });

  describe('getTrustDocumentUrl', () => {
    it('should call service.getTrustDocumentUrl with documentId and dto', async () => {
      const dto = { organizationId: orgId } as any;
      const documentId = 'td_1';
      const mockResult = { url: 'https://signed-url' };
      mockService.getTrustDocumentUrl.mockResolvedValue(mockResult);

      const result = await controller.getTrustDocumentUrl(dto, documentId, authContext);

      expect(result).toEqual(mockResult);
      expect(service.getTrustDocumentUrl).toHaveBeenCalledWith(documentId, dto);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.getTrustDocumentUrl(dto, 'td_1', otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTrustDocument', () => {
    it('should call service.deleteTrustDocument with documentId and dto', async () => {
      const dto = { organizationId: orgId } as any;
      const documentId = 'td_1';
      mockService.deleteTrustDocument.mockResolvedValue({ success: true });

      const result = await controller.deleteTrustDocument(dto, documentId, authContext);

      expect(result).toEqual({ success: true });
      expect(service.deleteTrustDocument).toHaveBeenCalledWith(documentId, dto);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const dto = { organizationId: orgId } as any;

      await expect(
        controller.deleteTrustDocument(dto, 'td_1', otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('togglePortal', () => {
    it('should call service.togglePortal with correct params', async () => {
      const body = { enabled: true, contactEmail: 'test@example.com', primaryColor: '#000' };
      mockService.togglePortal.mockResolvedValue({ enabled: true });

      const result = await controller.togglePortal(orgId, body);

      expect(result).toEqual({ enabled: true });
      expect(service.togglePortal).toHaveBeenCalledWith(
        orgId,
        true,
        'test@example.com',
        '#000',
      );
    });

    it('should pass undefined for optional fields', async () => {
      const body = { enabled: false };
      mockService.togglePortal.mockResolvedValue({ enabled: false });

      await controller.togglePortal(orgId, body);

      expect(service.togglePortal).toHaveBeenCalledWith(
        orgId,
        false,
        undefined,
        undefined,
      );
    });
  });

  describe('addCustomDomain', () => {
    it('should call service.addCustomDomain with organizationId and domain', async () => {
      const body = { domain: 'trust.example.com' };
      mockService.addCustomDomain.mockResolvedValue({ domain: 'trust.example.com' });

      const result = await controller.addCustomDomain(orgId, body);

      expect(result).toEqual({ domain: 'trust.example.com' });
      expect(service.addCustomDomain).toHaveBeenCalledWith(orgId, 'trust.example.com');
    });

    it('should throw BadRequestException when domain is empty', async () => {
      await expect(
        controller.addCustomDomain(orgId, { domain: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkDnsRecords', () => {
    it('should call service.checkDnsRecords with organizationId and domain', async () => {
      const body = { domain: 'trust.example.com' };
      const mockResult = { verified: true };
      mockService.checkDnsRecords.mockResolvedValue(mockResult);

      const result = await controller.checkDnsRecords(orgId, body);

      expect(result).toEqual(mockResult);
      expect(service.checkDnsRecords).toHaveBeenCalledWith(orgId, 'trust.example.com');
    });

    it('should throw BadRequestException when domain is empty', async () => {
      await expect(
        controller.checkDnsRecords(orgId, { domain: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFaqs', () => {
    it('should call service.updateFaqs with organizationId and faqs', async () => {
      const faqs = [{ question: 'Q1', answer: 'A1' }];
      mockService.updateFaqs.mockResolvedValue({ success: true });

      const result = await controller.updateFaqs(orgId, { faqs });

      expect(result).toEqual({ success: true });
      expect(service.updateFaqs).toHaveBeenCalledWith(orgId, faqs);
    });

    it('should default to empty array when faqs is undefined', async () => {
      mockService.updateFaqs.mockResolvedValue({ success: true });

      await controller.updateFaqs(orgId, {} as any);

      expect(service.updateFaqs).toHaveBeenCalledWith(orgId, []);
    });
  });

  describe('updateAllowedDomains', () => {
    it('should call service.updateAllowedDomains with organizationId and domains', async () => {
      const domains = ['example.com', 'test.com'];
      mockService.updateAllowedDomains.mockResolvedValue({ success: true });

      const result = await controller.updateAllowedDomains(orgId, { domains });

      expect(result).toEqual({ success: true });
      expect(service.updateAllowedDomains).toHaveBeenCalledWith(orgId, domains);
    });

    it('should default to empty array when domains is undefined', async () => {
      mockService.updateAllowedDomains.mockResolvedValue({ success: true });

      await controller.updateAllowedDomains(orgId, {} as any);

      expect(service.updateAllowedDomains).toHaveBeenCalledWith(orgId, []);
    });
  });

  describe('updateFrameworks', () => {
    it('should call service.updateFrameworks with organizationId and body', async () => {
      const body = { SOC2: true, ISO27001: false };
      mockService.updateFrameworks.mockResolvedValue({ success: true });

      const result = await controller.updateFrameworks(orgId, body);

      expect(result).toEqual({ success: true });
      expect(service.updateFrameworks).toHaveBeenCalledWith(orgId, body);
    });
  });

  describe('updateOverview', () => {
    it('should call service.updateOverview with organizationId and parsed dto', async () => {
      const body = { organizationId: orgId, overviewTitle: 'Our Trust', overviewContent: 'Desc' };
      mockService.updateOverview.mockResolvedValue({ success: true });

      const result = await controller.updateOverview(body as any, authContext);

      expect(result).toEqual({ success: true });
      expect(service.updateOverview).toHaveBeenCalledWith(
        orgId,
        expect.objectContaining({ overviewTitle: 'Our Trust', overviewContent: 'Desc' }),
      );
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const body = { organizationId: orgId, overviewTitle: 'test' };

      await expect(
        controller.updateOverview(body as any, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOverview', () => {
    it('should call service.getOverview with organizationId', async () => {
      const mockResult = { title: 'Trust', description: 'Desc' };
      mockService.getOverview.mockResolvedValue(mockResult);

      const result = await controller.getOverview(orgId, authContext);

      expect(result).toEqual(mockResult);
      expect(service.getOverview).toHaveBeenCalledWith(orgId);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      await expect(
        controller.getOverview(orgId, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCustomLink', () => {
    it('should call service.createCustomLink with organizationId and parsed dto', async () => {
      const body = { organizationId: orgId, title: 'Link', url: 'https://example.com' };
      mockService.createCustomLink.mockResolvedValue({ id: 'cl_1' });

      const result = await controller.createCustomLink(body as any, authContext);

      expect(result).toEqual({ id: 'cl_1' });
      expect(service.createCustomLink).toHaveBeenCalledWith(
        orgId,
        expect.objectContaining({ title: 'Link', url: 'https://example.com' }),
      );
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const body = { organizationId: orgId, title: 'Link', url: 'https://example.com' };

      await expect(
        controller.createCustomLink(body as any, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCustomLink', () => {
    it('should call service.updateCustomLink with linkId, dto, and organizationId', async () => {
      const body = { title: 'Updated', url: 'https://new.com' };
      mockService.updateCustomLink.mockResolvedValue({ id: 'cl_1' });

      const result = await controller.updateCustomLink('cl_1', body as any, authContext);

      expect(result).toEqual({ id: 'cl_1' });
      expect(service.updateCustomLink).toHaveBeenCalledWith(
        'cl_1',
        expect.objectContaining({ title: 'Updated', url: 'https://new.com' }),
        orgId,
      );
    });
  });

  describe('deleteCustomLink', () => {
    it('should call service.deleteCustomLink with linkId and organizationId', async () => {
      mockService.deleteCustomLink.mockResolvedValue({ success: true });

      const result = await controller.deleteCustomLink('cl_1', authContext);

      expect(result).toEqual({ success: true });
      expect(service.deleteCustomLink).toHaveBeenCalledWith('cl_1', orgId);
    });
  });

  describe('reorderCustomLinks', () => {
    it('should call service.reorderCustomLinks with organizationId and linkIds', async () => {
      const body = { organizationId: orgId, linkIds: ['cl_1', 'cl_2'] };
      mockService.reorderCustomLinks.mockResolvedValue({ success: true });

      const result = await controller.reorderCustomLinks(body as any, authContext);

      expect(result).toEqual({ success: true });
      expect(service.reorderCustomLinks).toHaveBeenCalledWith(orgId, ['cl_1', 'cl_2']);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      const body = { organizationId: orgId, linkIds: ['cl_1'] };

      await expect(
        controller.reorderCustomLinks(body as any, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listCustomLinks', () => {
    it('should call service.listCustomLinks with organizationId', async () => {
      const mockResult = [{ id: 'cl_1', label: 'Link' }];
      mockService.listCustomLinks.mockResolvedValue(mockResult);

      const result = await controller.listCustomLinks(orgId, authContext);

      expect(result).toEqual(mockResult);
      expect(service.listCustomLinks).toHaveBeenCalledWith(orgId);
    });

    it('should throw BadRequestException for organization mismatch', async () => {
      await expect(
        controller.listCustomLinks(orgId, otherOrgAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateVendorTrustSettings', () => {
    it('should call service.updateVendorTrustSettings with vendorId, dto, and organizationId', async () => {
      const body = { showOnTrustPortal: true };
      mockService.updateVendorTrustSettings.mockResolvedValue({ success: true });

      const result = await controller.updateVendorTrustSettings('v_1', body as any, authContext);

      expect(result).toEqual({ success: true });
      expect(service.updateVendorTrustSettings).toHaveBeenCalledWith(
        'v_1',
        expect.objectContaining({ showOnTrustPortal: true }),
        orgId,
      );
    });
  });

  describe('listVendors', () => {
    it('should call service.getPublicVendors when all is not true', async () => {
      const mockResult = [{ id: 'v_1' }];
      mockService.getPublicVendors.mockResolvedValue(mockResult);

      const result = await controller.listVendors(orgId);

      expect(result).toEqual(mockResult);
      expect(service.getPublicVendors).toHaveBeenCalledWith(orgId);
    });

    it('should call service.getAllVendorsWithSync when all is true', async () => {
      const mockResult = [{ id: 'v_1' }, { id: 'v_2' }];
      mockService.getAllVendorsWithSync.mockResolvedValue(mockResult);

      const result = await controller.listVendors(orgId, 'true');

      expect(result).toEqual(mockResult);
      expect(service.getAllVendorsWithSync).toHaveBeenCalledWith(orgId);
    });

    it('should call service.getPublicVendors when all is false', async () => {
      mockService.getPublicVendors.mockResolvedValue([]);

      await controller.listVendors(orgId, 'false');

      expect(service.getPublicVendors).toHaveBeenCalledWith(orgId);
      expect(service.getAllVendorsWithSync).not.toHaveBeenCalled();
    });
  });
});
