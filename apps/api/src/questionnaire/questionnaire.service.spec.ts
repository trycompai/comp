import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireService } from './questionnaire.service';
import { UploadsService } from '../uploads/uploads.service';

// Mock external dependencies
jest.mock('@db', () => ({
  db: {
    questionnaire: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    questionnaireQuestionAnswer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    securityQuestionnaireManualAnswer: {
      upsert: jest.fn(),
    },
  },
  Prisma: {
    JsonNull: 'DbNull',
  },
}));

jest.mock('@/vector-store/lib', () => ({
  syncManualAnswerToVector: jest.fn(),
  syncOrganizationEmbeddings: jest.fn(),
}));

jest.mock('@/trigger/questionnaire/answer-question', () => ({
  answerQuestion: jest.fn(),
}));

jest.mock('@/trigger/questionnaire/answer-question-helpers', () => ({
  generateAnswerWithRAGBatch: jest.fn(),
}));

jest.mock('@trigger.dev/sdk', () => ({
  tasks: {
    trigger: jest.fn(),
  },
}));

jest.mock('./utils/content-extractor', () => ({
  extractContentFromFile: jest.fn(),
}));

jest.mock('./utils/question-parser', () => ({
  parseQuestionsAndAnswers: jest.fn(),
}));

jest.mock('./utils/export-generator', () => ({
  generateExportFile: jest.fn(),
}));

jest.mock('./utils/questionnaire-storage', () => ({
  updateAnsweredCount: jest.fn(),
  persistQuestionnaireResult: jest.fn(),
  uploadQuestionnaireFile: jest.fn(),
  saveGeneratedAnswer: jest.fn(),
}));

import { db } from '@db';
import { syncManualAnswerToVector } from '@/vector-store/lib';
import { answerQuestion } from '@/trigger/questionnaire/answer-question';
import { tasks } from '@trigger.dev/sdk';
import {
  updateAnsweredCount,
  persistQuestionnaireResult,
  uploadQuestionnaireFile,
  saveGeneratedAnswer,
} from './utils/questionnaire-storage';
import { generateExportFile } from './utils/export-generator';

const mockDb = db as jest.Mocked<typeof db>;

describe('QuestionnaireService', () => {
  let service: QuestionnaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnaireService,
        {
          provide: UploadsService,
          useValue: { readUploadAsBase64: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<QuestionnaireService>(QuestionnaireService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return questionnaires filtered by org and status', async () => {
      const mockQuestionnaires = [
        {
          id: 'q1',
          filename: 'test.pdf',
          fileType: 'application/pdf',
          status: 'completed',
          totalQuestions: 5,
          answeredQuestions: 3,
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          questions: [{ id: 'qa1', question: 'Q1?', answer: 'A1' }],
        },
      ];
      (mockDb.questionnaire.findMany as jest.Mock).mockResolvedValue(
        mockQuestionnaires,
      );

      const result = await service.findAll('org_1');

      expect(result).toEqual(mockQuestionnaires);
      expect(mockDb.questionnaire.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org_1',
          status: { in: ['completed', 'parsing'] },
        },
        select: {
          id: true,
          filename: true,
          fileType: true,
          status: true,
          totalQuestions: true,
          answeredQuestions: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          questions: {
            orderBy: { questionIndex: 'asc' },
            select: {
              id: true,
              question: true,
              answer: true,
              status: true,
              questionIndex: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no questionnaires exist', async () => {
      (mockDb.questionnaire.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('org_1');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return questionnaire with questions', async () => {
      const mockQuestionnaire = {
        id: 'q1',
        filename: 'test.pdf',
        questions: [
          {
            id: 'qa1',
            question: 'Q1?',
            answer: 'A1',
            status: 'manual',
            questionIndex: 0,
            sources: null,
          },
        ],
      };
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(
        mockQuestionnaire,
      );

      const result = await service.findById('q1', 'org_1');

      expect(result).toEqual(mockQuestionnaire);
      expect(mockDb.questionnaire.findUnique).toHaveBeenCalledWith({
        where: { id: 'q1', organizationId: 'org_1' },
        include: {
          questions: {
            orderBy: { questionIndex: 'asc' },
            select: {
              id: true,
              question: true,
              answer: true,
              status: true,
              questionIndex: true,
              sources: true,
            },
          },
        },
      });
    });

    it('should return null when questionnaire not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('missing', 'org_1');

      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete questionnaire and return success', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        organizationId: 'org_1',
      });
      (mockDb.questionnaire.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteById('q1', 'org_1');

      expect(result).toEqual({ success: true });
      expect(mockDb.questionnaire.findUnique).toHaveBeenCalledWith({
        where: { id: 'q1', organizationId: 'org_1' },
      });
      expect(mockDb.questionnaire.delete).toHaveBeenCalledWith({
        where: { id: 'q1' },
      });
    });

    it('should throw when questionnaire not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteById('missing', 'org_1')).rejects.toThrow(
        'Questionnaire with ID missing not found',
      );
      expect(mockDb.questionnaire.delete).not.toHaveBeenCalled();
    });
  });

  describe('saveAnswer', () => {
    const baseSaveDto = {
      questionnaireId: 'q1',
      organizationId: 'org_1',
      questionIndex: 0,
      answer: 'Yes, we do.',
      status: 'manual' as const,
    };

    it('should return error when neither questionIndex nor questionAnswerId provided', async () => {
      const result = await service.saveAnswer({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        answer: 'Yes',
        status: 'manual',
      } as any);

      expect(result).toEqual({
        success: false,
        error: 'questionIndex or questionAnswerId is required',
      });
    });

    it('should return error when questionnaire not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.saveAnswer(baseSaveDto as any);

      expect(result).toEqual({
        success: false,
        error: 'Questionnaire not found',
      });
    });

    it('should return error when question answer not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        questions: [],
      });
      (
        mockDb.questionnaireQuestionAnswer.findFirst as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.saveAnswer(baseSaveDto as any);

      expect(result).toEqual({
        success: false,
        error: 'Question answer not found',
      });
    });

    it('should save manual answer and sync to vector DB', async () => {
      const existingQuestion = {
        id: 'qa1',
        question: 'Do you have a policy?',
        questionIndex: 0,
      };
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        questions: [existingQuestion],
      });
      (
        mockDb.questionnaireQuestionAnswer.update as jest.Mock
      ).mockResolvedValue({});
      (
        mockDb.securityQuestionnaireManualAnswer.upsert as jest.Mock
      ).mockResolvedValue({ id: 'ma1' });
      (syncManualAnswerToVector as jest.Mock).mockResolvedValue(undefined);
      (updateAnsweredCount as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveAnswer(baseSaveDto as any);

      expect(result).toEqual({ success: true });
      expect(mockDb.questionnaireQuestionAnswer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qa1' },
          data: expect.objectContaining({
            answer: 'Yes, we do.',
            status: 'manual',
          }),
        }),
      );
      expect(
        mockDb.securityQuestionnaireManualAnswer.upsert,
      ).toHaveBeenCalled();
      expect(syncManualAnswerToVector).toHaveBeenCalledWith('ma1', 'org_1');
      expect(updateAnsweredCount).toHaveBeenCalledWith('q1');
    });

    it('should not sync to vector DB for generated answers', async () => {
      const existingQuestion = {
        id: 'qa1',
        question: 'Do you have a policy?',
        questionIndex: 0,
      };
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        questions: [existingQuestion],
      });
      (
        mockDb.questionnaireQuestionAnswer.update as jest.Mock
      ).mockResolvedValue({});
      (updateAnsweredCount as jest.Mock).mockResolvedValue(undefined);

      const result = await service.saveAnswer({
        ...baseSaveDto,
        status: 'generated',
      } as any);

      expect(result).toEqual({ success: true });
      expect(
        mockDb.securityQuestionnaireManualAnswer.upsert,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteAnswer', () => {
    it('should return error when questionnaire not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.deleteAnswer({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionAnswerId: 'qa1',
      } as any);

      expect(result).toEqual({
        success: false,
        error: 'Questionnaire not found',
      });
    });

    it('should return error when question answer not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
      });
      (
        mockDb.questionnaireQuestionAnswer.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.deleteAnswer({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionAnswerId: 'qa1',
      } as any);

      expect(result).toEqual({
        success: false,
        error: 'Question answer not found',
      });
    });

    it('should clear answer and update count', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
      });
      (
        mockDb.questionnaireQuestionAnswer.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'qa1' });
      (
        mockDb.questionnaireQuestionAnswer.update as jest.Mock
      ).mockResolvedValue({});
      (updateAnsweredCount as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteAnswer({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionAnswerId: 'qa1',
      } as any);

      expect(result).toEqual({ success: true });
      expect(mockDb.questionnaireQuestionAnswer.update).toHaveBeenCalledWith({
        where: { id: 'qa1' },
        data: expect.objectContaining({
          answer: null,
          status: 'untouched',
        }),
      });
      expect(updateAnsweredCount).toHaveBeenCalledWith('q1');
    });
  });

  describe('exportById', () => {
    it('should export questionnaire in requested format', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        filename: 'test.pdf',
        questions: [
          { question: 'Q1?', answer: 'A1', questionIndex: 0 },
          { question: 'Q2?', answer: 'A2', questionIndex: 1 },
        ],
      });
      const mockExport = {
        fileBuffer: Buffer.from('data'),
        mimeType: 'text/csv',
        filename: 'test.csv',
      };
      (generateExportFile as jest.Mock).mockResolvedValue(mockExport);

      const result = await service.exportById({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        format: 'csv',
      } as any);

      expect(result).toEqual(mockExport);
      expect(generateExportFile).toHaveBeenCalledWith(
        [
          { question: 'Q1?', answer: 'A1' },
          { question: 'Q2?', answer: 'A2' },
        ],
        'csv',
        'test.pdf',
      );
    });

    it('should throw when questionnaire not found', async () => {
      (mockDb.questionnaire.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.exportById({
          questionnaireId: 'missing',
          organizationId: 'org_1',
          format: 'csv',
        } as any),
      ).rejects.toThrow('Questionnaire not found');
    });
  });

  describe('uploadAndParse', () => {
    it('should upload file and trigger async parsing', async () => {
      (uploadQuestionnaireFile as jest.Mock).mockResolvedValue({
        s3Key: 'key',
        fileSize: 1024,
      });
      (tasks.trigger as jest.Mock).mockResolvedValue({
        id: 'run_123',
        publicAccessToken: 'token_123',
      });

      const result = await service.uploadAndParse({
        organizationId: 'org_1',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileData: 'base64data',
        source: 'internal',
      } as any);

      expect(result).toEqual({
        runId: 'run_123',
        publicAccessToken: 'token_123',
      });
      expect(uploadQuestionnaireFile).toHaveBeenCalled();
      expect(tasks.trigger).toHaveBeenCalledWith('parse-questionnaire', {
        inputType: 's3',
        organizationId: 'org_1',
        s3Key: 'key',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      });
    });

    it('should throw when upload fails', async () => {
      (uploadQuestionnaireFile as jest.Mock).mockResolvedValue(null);

      await expect(
        service.uploadAndParse({
          organizationId: 'org_1',
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileData: 'base64data',
        } as any),
      ).rejects.toThrow('Failed to upload questionnaire file to S3');
    });
  });

  describe('triggerAutoAnswer', () => {
    it('triggers background generation and returns a run handle', async () => {
      (mockDb.questionnaire.findFirst as jest.Mock).mockResolvedValue({
        id: 'qst_1',
        totalQuestions: 23,
        answeredQuestions: 0,
      });
      (tasks.trigger as jest.Mock).mockResolvedValue({
        id: 'run_abc',
        publicAccessToken: 'token_abc',
      });

      const result = await service.triggerAutoAnswer('qst_1', 'org_1');

      expect(tasks.trigger).toHaveBeenCalledWith('auto-answer-questionnaire', {
        questionnaireId: 'qst_1',
        organizationId: 'org_1',
      });
      expect(result).toEqual(
        expect.objectContaining({
          questionnaireId: 'qst_1',
          runId: 'run_abc',
          publicAccessToken: 'token_abc',
          status: 'generating',
          totalQuestions: 23,
          answeredQuestions: 0,
        }),
      );
    });

    it('throws NotFound when the questionnaire does not exist', async () => {
      (mockDb.questionnaire.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.triggerAutoAnswer('qst_missing', 'org_1'),
      ).rejects.toThrow('not found');
      expect(tasks.trigger).not.toHaveBeenCalled();
    });

    it('throws when the questionnaire has no parsed questions yet', async () => {
      (mockDb.questionnaire.findFirst as jest.Mock).mockResolvedValue({
        id: 'qst_1',
        totalQuestions: 0,
        answeredQuestions: 0,
      });

      await expect(
        service.triggerAutoAnswer('qst_1', 'org_1'),
      ).rejects.toThrow('no parsed questions');
      expect(tasks.trigger).not.toHaveBeenCalled();
    });
  });

  describe('answerSingleQuestion', () => {
    it('should answer question and save result when questionnaireId provided', async () => {
      (answerQuestion as jest.Mock).mockResolvedValue({
        success: true,
        questionIndex: 0,
        question: 'Q1?',
        answer: 'A1',
        sources: [],
      });
      (saveGeneratedAnswer as jest.Mock).mockResolvedValue(undefined);

      const result = await service.answerSingleQuestion({
        question: 'Q1?',
        organizationId: 'org_1',
        questionIndex: 0,
        totalQuestions: 5,
        questionnaireId: 'q1',
      } as any);

      expect(result.success).toBe(true);
      expect(result.answer).toBe('A1');
      expect(saveGeneratedAnswer).toHaveBeenCalledWith({
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionIndex: 0,
        answer: 'A1',
        sources: [],
      });
    });

    it('should not save answer when no questionnaireId', async () => {
      (answerQuestion as jest.Mock).mockResolvedValue({
        success: true,
        questionIndex: 0,
        question: 'Q1?',
        answer: 'A1',
        sources: [],
      });

      const result = await service.answerSingleQuestion({
        question: 'Q1?',
        organizationId: 'org_1',
        questionIndex: 0,
        totalQuestions: 5,
      } as any);

      expect(result.success).toBe(true);
      expect(saveGeneratedAnswer).not.toHaveBeenCalled();
    });

    it('should not save answer when answer generation failed', async () => {
      (answerQuestion as jest.Mock).mockResolvedValue({
        success: false,
        questionIndex: 0,
        question: 'Q1?',
        answer: null,
        sources: [],
      });

      const result = await service.answerSingleQuestion({
        question: 'Q1?',
        organizationId: 'org_1',
        questionIndex: 0,
        totalQuestions: 5,
        questionnaireId: 'q1',
      } as any);

      expect(result.success).toBe(false);
      expect(saveGeneratedAnswer).not.toHaveBeenCalled();
    });
  });
});
