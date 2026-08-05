import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

// The controller pulls in the auth guard (and therefore the Prisma client and
// the @trycompai/auth permission definitions) at import time. The service and
// guards are fully mocked/overridden below, so none of this is exercised — stub
// them out to keep this a hermetic unit test (matches the convention used by
// the other controller specs in this app).
jest.mock('@db', () => ({ db: {} }));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('KnowledgeBaseController', () => {
  let controller: KnowledgeBaseController;
  let service: jest.Mocked<KnowledgeBaseService>;

  const mockService = {
    listDocuments: jest.fn(),
    listManualAnswers: jest.fn(),
    saveManualAnswer: jest.fn(),
    uploadDocument: jest.fn(),
    getDownloadUrl: jest.fn(),
    getViewUrl: jest.fn(),
    deleteDocument: jest.fn(),
    processDocuments: jest.fn(),
    createRunReadToken: jest.fn(),
    deleteManualAnswer: jest.fn(),
    deleteAllManualAnswers: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeBaseController],
      providers: [{ provide: KnowledgeBaseService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<KnowledgeBaseController>(KnowledgeBaseController);
    service = module.get(KnowledgeBaseService);

    jest.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('should return documents from service', async () => {
      const mockDocs = [
        { id: 'd1', name: 'doc.pdf', processingStatus: 'completed' },
      ];
      mockService.listDocuments.mockResolvedValue(mockDocs);

      const result = await controller.listDocuments('org_1');

      expect(result).toEqual(mockDocs);
      expect(service.listDocuments).toHaveBeenCalledWith('org_1');
    });
  });

  describe('listManualAnswers', () => {
    it('should return manual answers from service', async () => {
      const mockAnswers = [{ id: 'ma1', question: 'Q1?', answer: 'A1' }];
      mockService.listManualAnswers.mockResolvedValue(mockAnswers);

      const result = await controller.listManualAnswers('org_1');

      expect(result).toEqual(mockAnswers);
      expect(service.listManualAnswers).toHaveBeenCalledWith('org_1');
    });
  });

  describe('saveManualAnswer', () => {
    it('should pass dto with organizationId to service', async () => {
      const dto = { question: 'Q1?', answer: 'A1', tags: ['security'] };
      mockService.saveManualAnswer.mockResolvedValue({
        success: true,
        manualAnswerId: 'ma1',
      });

      const result = await controller.saveManualAnswer('org_1', dto as any);

      expect(result).toEqual({ success: true, manualAnswerId: 'ma1' });
      expect(service.saveManualAnswer).toHaveBeenCalledWith({
        ...dto,
        organizationId: 'org_1',
      });
    });
  });

  // These handlers scope to the caller's active organization from the auth
  // context. Each test passes one org in the body and a different authenticated
  // org, and asserts the authenticated org is what reaches the service.
  const AUTH_ORG = 'org_authenticated';
  const OTHER_ORG = 'org_supplied_in_body';

  describe('uploadDocument', () => {
    it('uses the authenticated organization, not the body organizationId', async () => {
      const dto = {
        organizationId: OTHER_ORG,
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        fileData: 'base64',
      };
      mockService.uploadDocument.mockResolvedValue({
        id: 'd1',
        name: 'doc.pdf',
        s3Key: 'key',
      });

      const result = await controller.uploadDocument(AUTH_ORG, dto as any);

      expect(result.id).toBe('d1');
      expect(service.uploadDocument).toHaveBeenCalledWith({
        ...dto,
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('getDownloadUrl', () => {
    it('scopes to the authenticated organization and merges documentId', async () => {
      const dto = { organizationId: OTHER_ORG };
      mockService.getDownloadUrl.mockResolvedValue({
        signedUrl: 'https://example.com/signed',
        fileName: 'doc.pdf',
      });

      const result = await controller.getDownloadUrl('d1', AUTH_ORG, dto as any);

      expect(result.signedUrl).toBe('https://example.com/signed');
      expect(service.getDownloadUrl).toHaveBeenCalledWith({
        documentId: 'd1',
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('getViewUrl', () => {
    it('scopes to the authenticated organization and merges documentId', async () => {
      const dto = { organizationId: OTHER_ORG };
      mockService.getViewUrl.mockResolvedValue({
        signedUrl: 'https://example.com/view',
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        viewableInBrowser: true,
      });

      const result = await controller.getViewUrl('d1', AUTH_ORG, dto as any);

      expect(result.signedUrl).toBe('https://example.com/view');
      expect(service.getViewUrl).toHaveBeenCalledWith({
        documentId: 'd1',
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('deleteDocument', () => {
    it('scopes to the authenticated organization and merges documentId', async () => {
      const dto = { organizationId: OTHER_ORG };
      mockService.deleteDocument.mockResolvedValue({ success: true });

      const result = await controller.deleteDocument('d1', AUTH_ORG, dto as any);

      expect(result).toEqual({ success: true });
      expect(service.deleteDocument).toHaveBeenCalledWith({
        documentId: 'd1',
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('processDocuments', () => {
    it('uses the authenticated organization, not the body organizationId', async () => {
      const dto = {
        organizationId: OTHER_ORG,
        documentIds: ['d1', 'd2'],
      };
      mockService.processDocuments.mockResolvedValue({
        success: true,
        runId: 'run_1',
        message: 'Processing 2 documents in parallel...',
      });

      const result = await controller.processDocuments(AUTH_ORG, dto as any);

      expect(result.success).toBe(true);
      expect(service.processDocuments).toHaveBeenCalledWith({
        ...dto,
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('deleteManualAnswer', () => {
    it('scopes to the authenticated organization and merges manualAnswerId', async () => {
      const dto = { organizationId: OTHER_ORG };
      mockService.deleteManualAnswer.mockResolvedValue({ success: true });

      const result = await controller.deleteManualAnswer(
        'ma1',
        AUTH_ORG,
        dto as any,
      );

      expect(result).toEqual({ success: true });
      expect(service.deleteManualAnswer).toHaveBeenCalledWith({
        manualAnswerId: 'ma1',
        organizationId: AUTH_ORG,
      });
    });
  });

  describe('deleteAllManualAnswers', () => {
    it('uses the authenticated organization, not the body organizationId', async () => {
      const dto = { organizationId: OTHER_ORG };
      mockService.deleteAllManualAnswers.mockResolvedValue({ success: true });

      const result = await controller.deleteAllManualAnswers(
        AUTH_ORG,
        dto as any,
      );

      expect(result).toEqual({ success: true });
      expect(service.deleteAllManualAnswers).toHaveBeenCalledWith({
        organizationId: AUTH_ORG,
      });
    });
  });
});
