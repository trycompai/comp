import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseService } from './knowledge-base.service';

jest.mock('@db', () => ({
  db: {
    knowledgeBaseDocument: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    securityQuestionnaireManualAnswer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: jest.fn() },
  auth: { createPublicToken: jest.fn() },
}));

jest.mock('@/vector-store/lib', () => ({
  syncManualAnswerToVector: jest.fn(),
}));

jest.mock('./utils/s3-operations', () => ({
  uploadToS3: jest.fn(),
  generateDownloadUrl: jest.fn(),
  generateViewUrl: jest.fn(),
  deleteFromS3: jest.fn(),
}));

jest.mock('./utils/constants', () => ({
  isViewableInBrowser: jest.fn(),
}));

jest.mock(
  '@/trigger/vector-store/process-knowledge-base-document',
  () => ({}),
);
jest.mock(
  '@/trigger/vector-store/process-knowledge-base-documents-orchestrator',
  () => ({}),
);
jest.mock(
  '@/trigger/vector-store/delete-knowledge-base-document',
  () => ({}),
);
jest.mock('@/trigger/vector-store/delete-manual-answer', () => ({}));
jest.mock(
  '@/trigger/vector-store/delete-all-manual-answers-orchestrator',
  () => ({}),
);

import { db } from '@db';
import { tasks, auth } from '@trigger.dev/sdk';
import { syncManualAnswerToVector } from '@/vector-store/lib';
import {
  uploadToS3,
  generateDownloadUrl,
  generateViewUrl,
  deleteFromS3,
} from './utils/s3-operations';

const mockDb = db as jest.Mocked<typeof db>;

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeBaseService],
    }).compile();

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);

    jest.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('should return documents for organization', async () => {
      const mockDocs = [
        { id: 'd1', name: 'doc.pdf', processingStatus: 'completed' },
      ];
      (mockDb.knowledgeBaseDocument.findMany as jest.Mock).mockResolvedValue(
        mockDocs,
      );

      const result = await service.listDocuments('org_1');

      expect(result).toEqual(mockDocs);
      expect(mockDb.knowledgeBaseDocument.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        select: expect.objectContaining({
          id: true,
          name: true,
          processingStatus: true,
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('listManualAnswers', () => {
    it('should return manual answers for organization', async () => {
      const mockAnswers = [
        { id: 'ma1', question: 'Q1?', answer: 'A1', tags: [] },
      ];
      (
        mockDb.securityQuestionnaireManualAnswer.findMany as jest.Mock
      ).mockResolvedValue(mockAnswers);

      const result = await service.listManualAnswers('org_1');

      expect(result).toEqual(mockAnswers);
      expect(
        mockDb.securityQuestionnaireManualAnswer.findMany,
      ).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        select: expect.objectContaining({
          id: true,
          question: true,
          answer: true,
          tags: true,
        }),
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('saveManualAnswer', () => {
    it('should upsert manual answer and sync to vector DB', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.upsert as jest.Mock
      ).mockResolvedValue({ id: 'ma1' });
      (syncManualAnswerToVector as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveManualAnswer({
        organizationId: 'org_1',
        question: 'Q1?',
        answer: 'A1',
        tags: ['security'],
      });

      expect(result).toEqual({ success: true, manualAnswerId: 'ma1' });
      expect(
        mockDb.securityQuestionnaireManualAnswer.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_question: {
              organizationId: 'org_1',
              question: 'Q1?',
            },
          },
          create: expect.objectContaining({
            question: 'Q1?',
            answer: 'A1',
            tags: ['security'],
          }),
          update: expect.objectContaining({
            answer: 'A1',
            tags: ['security'],
          }),
        }),
      );
      expect(syncManualAnswerToVector).toHaveBeenCalledWith('ma1', 'org_1');
    });

    it('should still succeed if vector sync fails', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.upsert as jest.Mock
      ).mockResolvedValue({ id: 'ma1' });
      (syncManualAnswerToVector as jest.Mock).mockRejectedValue(
        new Error('Vector DB error'),
      );

      const result = await service.saveManualAnswer({
        organizationId: 'org_1',
        question: 'Q1?',
        answer: 'A1',
      });

      expect(result).toEqual({ success: true, manualAnswerId: 'ma1' });
    });
  });

  describe('uploadDocument', () => {
    it('should upload to S3 and create DB record', async () => {
      (uploadToS3 as jest.Mock).mockResolvedValue({
        s3Key: 'org_1/doc.pdf',
        fileSize: 1024,
      });
      (mockDb.knowledgeBaseDocument.create as jest.Mock).mockResolvedValue({
        id: 'd1',
        name: 'doc.pdf',
        s3Key: 'org_1/doc.pdf',
      });

      const result = await service.uploadDocument({
        organizationId: 'org_1',
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        fileData: 'base64data',
      } as any);

      expect(result).toEqual({
        id: 'd1',
        name: 'doc.pdf',
        s3Key: 'org_1/doc.pdf',
      });
      expect(uploadToS3).toHaveBeenCalledWith(
        'org_1',
        'doc.pdf',
        'application/pdf',
        'base64data',
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate signed download URL', async () => {
      (mockDb.knowledgeBaseDocument.findUnique as jest.Mock).mockResolvedValue({
        s3Key: 'key',
        name: 'doc.pdf',
        fileType: 'application/pdf',
      });
      (generateDownloadUrl as jest.Mock).mockResolvedValue({
        signedUrl: 'https://s3.example.com/signed',
      });

      const result = await service.getDownloadUrl({
        documentId: 'd1',
        organizationId: 'org_1',
      });

      expect(result.signedUrl).toBe('https://s3.example.com/signed');
      expect(result.fileName).toBe('doc.pdf');
    });

    it('should throw when document not found', async () => {
      (mockDb.knowledgeBaseDocument.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.getDownloadUrl({
          documentId: 'missing',
          organizationId: 'org_1',
        }),
      ).rejects.toThrow('Document not found');
    });
  });

  describe('deleteDocument', () => {
    it('should delete from vector DB, S3, and database', async () => {
      (mockDb.knowledgeBaseDocument.findUnique as jest.Mock).mockResolvedValue({
        id: 'd1',
        s3Key: 'key',
      });
      (tasks.trigger as jest.Mock).mockResolvedValue({ id: 'run_1' });
      (auth.createPublicToken as jest.Mock).mockResolvedValue('token_1');
      (deleteFromS3 as jest.Mock).mockResolvedValue(true);
      (mockDb.knowledgeBaseDocument.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteDocument({
        documentId: 'd1',
        organizationId: 'org_1',
      });

      expect(result.success).toBe(true);
      expect(deleteFromS3).toHaveBeenCalledWith('key');
      expect(mockDb.knowledgeBaseDocument.delete).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
    });

    it('should throw when document not found', async () => {
      (mockDb.knowledgeBaseDocument.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteDocument({
          documentId: 'missing',
          organizationId: 'org_1',
        }),
      ).rejects.toThrow('Document not found');
    });
  });

  describe('deleteManualAnswer', () => {
    it('should delete manual answer and trigger vector deletion', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'ma1' });
      (tasks.trigger as jest.Mock).mockResolvedValue({ id: 'run_1' });
      (
        mockDb.securityQuestionnaireManualAnswer.delete as jest.Mock
      ).mockResolvedValue({});

      const result = await service.deleteManualAnswer({
        manualAnswerId: 'ma1',
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(
        mockDb.securityQuestionnaireManualAnswer.delete,
      ).toHaveBeenCalledWith({ where: { id: 'ma1' } });
    });

    it('should return error when manual answer not found', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.deleteManualAnswer({
        manualAnswerId: 'missing',
        organizationId: 'org_1',
      });

      expect(result).toEqual({
        success: false,
        error: 'Manual answer not found',
      });
    });
  });

  describe('deleteAllManualAnswers', () => {
    it('should delete all manual answers and trigger batch deletion', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'ma1' }, { id: 'ma2' }]);
      (tasks.trigger as jest.Mock).mockResolvedValue({ id: 'run_1' });
      (
        mockDb.securityQuestionnaireManualAnswer.deleteMany as jest.Mock
      ).mockResolvedValue({ count: 2 });

      const result = await service.deleteAllManualAnswers({
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(tasks.trigger).toHaveBeenCalled();
      expect(
        mockDb.securityQuestionnaireManualAnswer.deleteMany,
      ).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
      });
    });

    it('should skip vector deletion when no manual answers exist', async () => {
      (
        mockDb.securityQuestionnaireManualAnswer.findMany as jest.Mock
      ).mockResolvedValue([]);
      (
        mockDb.securityQuestionnaireManualAnswer.deleteMany as jest.Mock
      ).mockResolvedValue({ count: 0 });

      const result = await service.deleteAllManualAnswers({
        organizationId: 'org_1',
      });

      expect(result).toEqual({ success: true });
      expect(tasks.trigger).not.toHaveBeenCalled();
    });
  });

  describe('createRunReadToken', () => {
    it('should create and return public token', async () => {
      (auth.createPublicToken as jest.Mock).mockResolvedValue('token_123');

      const result = await service.createRunReadToken('run_1');

      expect(result).toBe('token_123');
      expect(auth.createPublicToken).toHaveBeenCalledWith({
        scopes: { read: { runs: ['run_1'] } },
        expirationTime: '1hr',
      });
    });

    it('should return undefined when token creation fails', async () => {
      (auth.createPublicToken as jest.Mock).mockRejectedValue(
        new Error('Token error'),
      );

      const result = await service.createRunReadToken('run_1');

      expect(result).toBeUndefined();
    });
  });
});
