import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
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
      const mockAnswers = [
        { id: 'ma1', question: 'Q1?', answer: 'A1' },
      ];
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

  describe('uploadDocument', () => {
    it('should delegate to service', async () => {
      const dto = {
        organizationId: 'org_1',
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        fileData: 'base64',
      };
      mockService.uploadDocument.mockResolvedValue({
        id: 'd1',
        name: 'doc.pdf',
        s3Key: 'key',
      });

      const result = await controller.uploadDocument(dto as any);

      expect(result.id).toBe('d1');
      expect(service.uploadDocument).toHaveBeenCalledWith(dto);
    });
  });

  describe('getDownloadUrl', () => {
    it('should merge documentId param with dto', async () => {
      const dto = { organizationId: 'org_1' };
      mockService.getDownloadUrl.mockResolvedValue({
        signedUrl: 'https://example.com/signed',
        fileName: 'doc.pdf',
      });

      const result = await controller.getDownloadUrl('d1', dto as any);

      expect(result.signedUrl).toBe('https://example.com/signed');
      expect(service.getDownloadUrl).toHaveBeenCalledWith({
        ...dto,
        documentId: 'd1',
      });
    });
  });

  describe('deleteDocument', () => {
    it('should merge documentId param with dto', async () => {
      const dto = { organizationId: 'org_1' };
      mockService.deleteDocument.mockResolvedValue({ success: true });

      const result = await controller.deleteDocument('d1', dto as any);

      expect(result).toEqual({ success: true });
      expect(service.deleteDocument).toHaveBeenCalledWith({
        ...dto,
        documentId: 'd1',
      });
    });
  });

  describe('processDocuments', () => {
    it('should delegate to service', async () => {
      const dto = {
        organizationId: 'org_1',
        documentIds: ['d1', 'd2'],
      };
      mockService.processDocuments.mockResolvedValue({
        success: true,
        runId: 'run_1',
        message: 'Processing 2 documents in parallel...',
      });

      const result = await controller.processDocuments(dto as any);

      expect(result.success).toBe(true);
      expect(service.processDocuments).toHaveBeenCalledWith(dto);
    });
  });

  describe('createRunToken', () => {
    it('should return token when created', async () => {
      mockService.createRunReadToken.mockResolvedValue('token_123');

      const result = await controller.createRunToken('run_1');

      expect(result).toEqual({ success: true, token: 'token_123' });
      expect(service.createRunReadToken).toHaveBeenCalledWith('run_1');
    });

    it('should return success false when token creation fails', async () => {
      mockService.createRunReadToken.mockResolvedValue(undefined);

      const result = await controller.createRunToken('run_1');

      expect(result).toEqual({ success: false, token: undefined });
    });
  });

  describe('deleteManualAnswer', () => {
    it('should merge manualAnswerId param with dto', async () => {
      const dto = { organizationId: 'org_1' };
      mockService.deleteManualAnswer.mockResolvedValue({ success: true });

      const result = await controller.deleteManualAnswer('ma1', dto as any);

      expect(result).toEqual({ success: true });
      expect(service.deleteManualAnswer).toHaveBeenCalledWith({
        ...dto,
        manualAnswerId: 'ma1',
      });
    });
  });

  describe('deleteAllManualAnswers', () => {
    it('should delegate to service', async () => {
      const dto = { organizationId: 'org_1' };
      mockService.deleteAllManualAnswers.mockResolvedValue({ success: true });

      const result = await controller.deleteAllManualAnswers(dto as any);

      expect(result).toEqual({ success: true });
      expect(service.deleteAllManualAnswers).toHaveBeenCalledWith(dto);
    });
  });
});
