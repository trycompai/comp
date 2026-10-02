import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

const mockSession = jest.fn();
const mockPermission = jest.fn();
const mockMember = jest.fn();

jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockSession(...args),
      hasPermission: (...args: unknown[]) => mockPermission(...args),
    },
  },
}));
jest.mock('@db', () => ({
  db: { member: { findFirst: (...args: unknown[]) => mockMember(...args) } },
}));
jest.mock('../auth/api-key.service', () => ({
  ApiKeyService: class ApiKeyService {},
}));
jest.mock('@trycompai/auth', () => ({
  RESTRICTED_ROLES: ['employee', 'contractor'],
  PRIVILEGED_ROLES: ['owner', 'admin', 'auditor'],
}));
jest.mock('../auth/app-access', () => ({ hasAppAccess: jest.fn() }));
jest.mock('./questionnaire.service', () => ({
  QuestionnaireService: class QuestionnaireService {},
}));
jest.mock('../trust-portal/trust-access.service', () => ({
  TrustAccessService: class TrustAccessService {},
}));
jest.mock('@/vector-store/lib', () => ({
  syncOrganizationEmbeddings: jest.fn(),
  findSimilarContentBatch: jest.fn(),
}));
jest.mock('@/trigger/questionnaire/answer-question-helpers', () => ({
  generateAnswerFromContent: jest.fn(),
}));

import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';
import { TrustAccessService } from '../trust-portal/trust-access.service';
import { ApiKeyService } from '../auth/api-key.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AnswerSingleQuestionDto } from './dto/answer-single-question.dto';

describe('questionnaire API authorization replaces public Trigger tokens', () => {
  const organizationId = 'org_aaaaaaaaaaaaaaaaaaaaaaaa';
  const victimId = 'org_bbbbbbbbbbbbbbbbbbbbbbbb';
  const service = {
    answerSingleQuestion: jest.fn(),
    uploadAndParse: jest.fn(),
  };
  let controller: QuestionnaireController;
  let hybridGuard: HybridAuthGuard;
  let permissionGuard: PermissionGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({
      user: { id: 'user', email: 'user@example.com', role: 'user' },
      session: { id: 'session', activeOrganizationId: organizationId },
    });
    mockMember.mockResolvedValue({
      id: 'member',
      role: 'admin',
      department: null,
    });
    mockPermission.mockResolvedValue({ success: true });
    service.answerSingleQuestion.mockResolvedValue({
      success: true,
      answer: 'Our policy',
      sources: [],
    });
    service.uploadAndParse.mockResolvedValue({
      runId: 'run',
      publicAccessToken: 'read-only-run-token',
    });
    const module = await Test.createTestingModule({
      controllers: [QuestionnaireController],
      providers: [
        HybridAuthGuard,
        PermissionGuard,
        Reflector,
        { provide: ApiKeyService, useValue: {} },
        { provide: QuestionnaireService, useValue: service },
        { provide: TrustAccessService, useValue: {} },
      ],
    }).compile();
    controller = module.get(QuestionnaireController);
    hybridGuard = module.get(HybridAuthGuard);
    permissionGuard = module.get(PermissionGuard);
  });

  const authorize = async (
    handler: 'answerSingleQuestion' | 'uploadAndParse',
  ) => {
    const request = { headers: { cookie: 'session-cookie' } };
    const context = new ExecutionContextHost(
      [request],
      QuestionnaireController,
      controller[handler],
    );
    context.setType('http');
    await hybridGuard.canActivate(context);
    await permissionGuard.canActivate(context);
  };

  it('allows an admin answer and overrides a valid victim organization ID', async () => {
    await authorize('answerSingleQuestion');
    const dto: AnswerSingleQuestionDto = {
      question: 'What is our policy?',
      organizationId: victimId,
      questionIndex: 0,
      totalQuestions: 1,
    };
    await controller.answerSingleQuestion(dto, organizationId);
    expect(service.answerSingleQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId }),
    );
    expect(mockMember).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId, userId: 'user' }),
      }),
    );
    expect(mockPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { permissions: { questionnaire: ['update'] } },
      }),
    );
  });

  it('allows an admin upload using only the authenticated organization', async () => {
    await authorize('uploadAndParse');
    await controller.uploadAndParse(
      {
        organizationId: victimId,
        fileName: 'questionnaire.pdf',
        fileType: 'application/pdf',
        fileData: 'data',
      },
      organizationId,
    );
    expect(service.uploadAndParse).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId }),
    );
    expect(mockPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { permissions: { questionnaire: ['create'] } },
      }),
    );
  });

  it.each(['answerSingleQuestion', 'uploadAndParse'] as const)(
    'denies read-only users before %s',
    async (handler) => {
      mockMember.mockResolvedValue({
        id: 'member',
        role: 'auditor',
        department: null,
      });
      mockPermission.mockResolvedValue({ success: false });
      await expect(authorize(handler)).rejects.toThrow(ForbiddenException);
      expect(service.answerSingleQuestion).not.toHaveBeenCalled();
      expect(service.uploadAndParse).not.toHaveBeenCalled();
    },
  );

  it('denies a session whose active organization has no current membership', async () => {
    mockMember.mockResolvedValue(null);
    await expect(authorize('answerSingleQuestion')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPermission).not.toHaveBeenCalled();
    expect(service.answerSingleQuestion).not.toHaveBeenCalled();
  });
});
