import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@/vector-store/lib', () => ({
  syncOrganizationEmbeddings: jest.fn(),
  findSimilarContentBatch: jest.fn(),
}));

jest.mock('@/trigger/questionnaire/answer-question-helpers', () => ({
  generateAnswerFromContent: jest.fn(),
}));

jest.mock('../trust-portal/email.service', () => ({
  TrustPortalEmailService: jest.fn(),
}));

jest.mock('../email/resend', () => ({
  sendEmail: jest.fn(),
}));

import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { TrustAccessService } from '../trust-portal/trust-access.service';
import type { AuthContext } from '../auth/types';

describe('QuestionnaireController', () => {
  let controller: QuestionnaireController;
  let service: jest.Mocked<QuestionnaireService>;

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    deleteById: jest.fn(),
    parseQuestionnaire: jest.fn(),
    answerSingleQuestion: jest.fn(),
    saveAnswer: jest.fn(),
    deleteAnswer: jest.fn(),
    exportById: jest.fn(),
    uploadAndParse: jest.fn(),
    autoAnswerAndExport: jest.fn(),
    saveGeneratedAnswerPublic: jest.fn(),
  };

  const mockTrustAccessService = {
    validateAccessTokenAndGetOrganizationId: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_1',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_1',
    userEmail: 'test@example.com',
    userRoles: ['owner'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionnaireController],
      providers: [
        { provide: QuestionnaireService, useValue: mockService },
        { provide: TrustAccessService, useValue: mockTrustAccessService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<QuestionnaireController>(QuestionnaireController);
    service = module.get(QuestionnaireService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return list with count and auth context', async () => {
      const mockData = [
        { id: 'q1', filename: 'test.pdf', questions: [] },
        { id: 'q2', filename: 'test2.xlsx', questions: [] },
      ];
      mockService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll('org_1', mockAuthContext);

      expect(result.data).toEqual(mockData);
      expect(result.count).toBe(2);
      expect(result.authType).toBe('session');
      expect(result.authenticatedUser).toEqual({
        id: 'usr_1',
        email: 'test@example.com',
      });
      expect(service.findAll).toHaveBeenCalledWith('org_1');
    });

    it('should return empty list when no questionnaires', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('org_1', mockAuthContext);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should not include authenticatedUser for api-key auth', async () => {
      const apiKeyContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
        userEmail: undefined,
        authType: 'api-key',
        isApiKey: true,
      };
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('org_1', apiKeyContext);

      expect(result.authenticatedUser).toBeUndefined();
      expect(result.authType).toBe('api-key');
    });
  });

  describe('findById', () => {
    it('should return questionnaire with auth context', async () => {
      const mockQuestionnaire = {
        id: 'q1',
        filename: 'test.pdf',
        questions: [{ id: 'qa1', question: 'Q1?' }],
      };
      mockService.findById.mockResolvedValue(mockQuestionnaire);

      const result = await controller.findById('q1', 'org_1', mockAuthContext);

      expect(result).toMatchObject({
        id: 'q1',
        filename: 'test.pdf',
        authType: 'session',
        authenticatedUser: { id: 'usr_1', email: 'test@example.com' },
      });
      expect(service.findById).toHaveBeenCalledWith('q1', 'org_1');
    });

    it('should throw NotFoundException when questionnaire not found', async () => {
      mockService.findById.mockResolvedValue(null);

      await expect(
        controller.findById('missing', 'org_1', mockAuthContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteById', () => {
    it('should delegate to service and return result', async () => {
      mockService.deleteById.mockResolvedValue({ success: true });

      const result = await controller.deleteById('q1', 'org_1');

      expect(result).toEqual({ success: true });
      expect(service.deleteById).toHaveBeenCalledWith('q1', 'org_1');
    });
  });

  describe('parseQuestionnaire', () => {
    it('should delegate to service', async () => {
      const dto = {
        fileData: 'base64data',
        fileType: 'application/pdf',
        organizationId: 'org_1',
        fileName: 'test.pdf',
      };
      const expected = {
        totalQuestions: 3,
        questionsAndAnswers: [
          { question: 'Q1?', answer: null },
          { question: 'Q2?', answer: null },
          { question: 'Q3?', answer: null },
        ],
      };
      mockService.parseQuestionnaire.mockResolvedValue(expected);

      const result = await controller.parseQuestionnaire(dto as any);

      expect(result).toEqual(expected);
      expect(service.parseQuestionnaire).toHaveBeenCalledWith(dto);
    });
  });

  describe('answerSingleQuestion', () => {
    it('should return formatted answer result', async () => {
      const dto = {
        question: 'What is your policy?',
        organizationId: 'org_1',
        questionIndex: 0,
        totalQuestions: 5,
      };
      mockService.answerSingleQuestion.mockResolvedValue({
        success: true,
        questionIndex: 0,
        question: 'What is your policy?',
        answer: 'Our policy covers...',
        sources: [{ sourceType: 'policy', score: 0.9 }],
        error: undefined,
      });

      const result = await controller.answerSingleQuestion(dto as any);

      expect(result.success).toBe(true);
      expect(result.data.answer).toBe('Our policy covers...');
      expect(result.data.questionIndex).toBe(0);
      expect(result.data.sources).toHaveLength(1);
    });
  });

  describe('saveAnswer', () => {
    it('should delegate to service', async () => {
      const dto = {
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionIndex: 0,
        answer: 'Yes',
        status: 'manual',
      };
      mockService.saveAnswer.mockResolvedValue({ success: true });

      const result = await controller.saveAnswer(dto as any);

      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteAnswer', () => {
    it('should delegate to service', async () => {
      const dto = {
        questionnaireId: 'q1',
        organizationId: 'org_1',
        questionAnswerId: 'qa1',
      };
      mockService.deleteAnswer.mockResolvedValue({ success: true });

      const result = await controller.deleteAnswer(dto as any);

      expect(result).toEqual({ success: true });
    });
  });

  describe('uploadAndParse', () => {
    it('should delegate to service', async () => {
      const dto = {
        organizationId: 'org_1',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileData: 'base64data',
        source: 'internal',
      };
      mockService.uploadAndParse.mockResolvedValue({
        questionnaireId: 'q1',
        totalQuestions: 10,
      });

      const result = await controller.uploadAndParse(dto as any);

      expect(result).toEqual({ questionnaireId: 'q1', totalQuestions: 10 });
    });
  });
});
