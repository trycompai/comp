import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { SOAController } from './soa.controller';
import { SOAService } from './soa.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@/vector-store/lib', () => ({
  syncOrganizationEmbeddings: jest.fn(),
}));

describe('SOAController', () => {
  let controller: SOAController;
  let soaService: jest.Mocked<SOAService>;

  const mockSOAService = {
    saveAnswer: jest.fn(),
    getDocument: jest.fn(),
    checkIfFullyRemote: jest.fn(),
    batchSearchSOAQuestions: jest.fn(),
    processSOAQuestionWithContent: jest.fn(),
    saveAnswersToDatabase: jest.fn(),
    updateConfigurationWithResults: jest.fn(),
    updateDocumentAfterAutoFill: jest.fn(),
    createDocument: jest.fn(),
    ensureSetup: jest.fn(),
    approveDocument: jest.fn(),
    declineDocument: jest.fn(),
    submitForApproval: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
  };

  const noUserAuthContext: AuthContext = {
    ...mockAuthContext,
    userId: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SOAController],
      providers: [{ provide: SOAService, useValue: mockSOAService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<SOAController>(SOAController);
    soaService = module.get(SOAService);

    jest.clearAllMocks();
  });

  describe('saveAnswer', () => {
    const dto = {
      documentId: 'doc_1',
      questionId: 'q_1',
      organizationId: 'org_123',
      isApplicable: true,
      justification: 'Applicable because...',
    };

    it('should call soaService.saveAnswer with dto and userId', async () => {
      mockSOAService.saveAnswer.mockResolvedValue({ success: true });

      const result = await controller.saveAnswer(
        dto as never,
        'org_123',
        mockAuthContext,
      );

      expect(soaService.saveAnswer).toHaveBeenCalledWith(dto, 'usr_123');
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(
        controller.saveAnswer(dto as never, 'org_123', noUserAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDocument', () => {
    const dto = {
      organizationId: 'org_123',
      auditId: 'aud_1',
    };

    it('should call soaService.createDocument with dto', async () => {
      const created = { id: 'doc_1', ...dto };
      mockSOAService.createDocument.mockResolvedValue(created);

      const result = await controller.createDocument(dto as never, 'org_123');

      expect(soaService.createDocument).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('ensureSetup', () => {
    const dto = {
      organizationId: 'org_123',
      auditId: 'aud_1',
    };

    it('should call soaService.ensureSetup with dto', async () => {
      const setupResult = { document: { id: 'doc_1' } };
      mockSOAService.ensureSetup.mockResolvedValue(setupResult);

      const result = await controller.ensureSetup(dto as never, 'org_123');

      expect(soaService.ensureSetup).toHaveBeenCalledWith(dto);
      expect(result).toEqual(setupResult);
    });
  });

  describe('approveDocument', () => {
    const dto = {
      documentId: 'doc_1',
      organizationId: 'org_123',
    };

    it('should call soaService.approveDocument with dto and userId', async () => {
      const approved = { success: true };
      mockSOAService.approveDocument.mockResolvedValue(approved);

      const result = await controller.approveDocument(
        dto as never,
        'org_123',
        mockAuthContext,
      );

      expect(soaService.approveDocument).toHaveBeenCalledWith(dto, 'usr_123');
      expect(result).toEqual(approved);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(
        controller.approveDocument(dto as never, 'org_123', noUserAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('declineDocument', () => {
    const dto = {
      documentId: 'doc_1',
      organizationId: 'org_123',
      reason: 'Needs more detail',
    };

    it('should call soaService.declineDocument with dto and userId', async () => {
      const declined = { success: true };
      mockSOAService.declineDocument.mockResolvedValue(declined);

      const result = await controller.declineDocument(
        dto as never,
        'org_123',
        mockAuthContext,
      );

      expect(soaService.declineDocument).toHaveBeenCalledWith(dto, 'usr_123');
      expect(result).toEqual(declined);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(
        controller.declineDocument(dto as never, 'org_123', noUserAuthContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForApproval', () => {
    const dto = {
      documentId: 'doc_1',
      organizationId: 'org_123',
    };

    it('should call soaService.submitForApproval with dto', async () => {
      const submitted = { success: true };
      mockSOAService.submitForApproval.mockResolvedValue(submitted);

      const result = await controller.submitForApproval(
        dto as never,
        'org_123',
      );

      expect(soaService.submitForApproval).toHaveBeenCalledWith(dto);
      expect(result).toEqual(submitted);
    });
  });
});
