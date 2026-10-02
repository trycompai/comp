import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { SOAController } from './soa.controller';
import { SOAService } from './soa.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class MockHybridAuthGuard {},
}));
jest.mock('../auth/permission.guard', () => ({
  PermissionGuard: class MockPermissionGuard {},
}));
jest.mock('./soa.service', () => ({
  SOAService: class MockSOAService {},
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@/vector-store/lib', () => ({
  syncOrganizationEmbeddings: jest.fn(),
}));

import { syncOrganizationEmbeddings } from '@/vector-store/lib';

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
    countAnsweredAnswers: jest.fn(),
    updateDocumentAfterAutoFill: jest.fn(),
    createDocument: jest.fn(),
    ensureSetup: jest.fn(),
    getSetup: jest.fn(),
    approveDocument: jest.fn(),
    declineDocument: jest.fn(),
    submitForApproval: jest.fn(),
    exportDocument: jest.fn(),
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
        dto,
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.saveAnswer.mockResolvedValue({ success: true });

      await controller.saveAnswer(spoofedDto, 'org_own', mockAuthContext);

      expect(soaService.saveAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
        'usr_123',
      );
    });
  });

  describe('autoFill', () => {
    const dto = {
      organizationId: 'org_123',
      documentId: 'doc_1',
    };

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.getDocument.mockResolvedValue({
        configuration: { questions: [] },
      });
      mockSOAService.checkIfFullyRemote.mockResolvedValue(false);
      mockSOAService.batchSearchSOAQuestions.mockResolvedValue(new Map());
      mockSOAService.saveAnswersToDatabase.mockResolvedValue(undefined);
      mockSOAService.countAnsweredAnswers.mockResolvedValue(0);
      mockSOAService.updateDocumentAfterAutoFill.mockResolvedValue(undefined);
      const res = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.autoFill(spoofedDto, 'org_own', mockAuthContext, res);

      expect(syncOrganizationEmbeddings).toHaveBeenCalledWith('org_own');
      expect(soaService.getDocument).toHaveBeenCalledWith('doc_1', 'org_own');
      expect(soaService.checkIfFullyRemote).toHaveBeenCalledWith('org_own');
      expect(soaService.batchSearchSOAQuestions).toHaveBeenCalledWith(
        [],
        'org_own',
      );
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const res = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.autoFill(dto as never, 'org_123', noUserAuthContext, res),
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.createDocument.mockResolvedValue({ id: 'doc_1' });

      await controller.createDocument(spoofedDto as never, 'org_own');

      expect(soaService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
      );
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.ensureSetup.mockResolvedValue({
        document: { id: 'doc_1' },
      });

      await controller.ensureSetup(spoofedDto as never, 'org_own');

      expect(soaService.ensureSetup).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
      );
    });
  });

  describe('getSetup', () => {
    const dto = {
      organizationId: 'org_123',
      frameworkId: 'fw_1',
    };

    it('should call soaService.getSetup with dto', async () => {
      const setupResult = {
        success: true,
        configuration: { id: 'cfg_1' },
        document: { id: 'doc_1' },
      };
      mockSOAService.getSetup.mockResolvedValue(setupResult);

      const result = await controller.getSetup(dto, 'org_123');

      expect(soaService.getSetup).toHaveBeenCalledWith(dto);
      expect(result).toEqual(setupResult);
    });

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.getSetup.mockResolvedValue({
        success: true,
        configuration: null,
        document: null,
      });

      await controller.getSetup(spoofedDto, 'org_own');

      expect(soaService.getSetup).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
      );
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
        dto,
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.approveDocument.mockResolvedValue({ success: true });

      await controller.approveDocument(spoofedDto, 'org_own', mockAuthContext);

      expect(soaService.approveDocument).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
        'usr_123',
      );
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
        dto,
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.declineDocument.mockResolvedValue({ success: true });

      await controller.declineDocument(spoofedDto, 'org_own', mockAuthContext);

      expect(soaService.declineDocument).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
        'usr_123',
      );
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

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.submitForApproval.mockResolvedValue({ success: true });

      await controller.submitForApproval(spoofedDto as never, 'org_own');

      expect(soaService.submitForApproval).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
      );
    });
  });

  describe('exportDocument', () => {
    const dto = {
      documentId: 'doc_1',
      format: 'pdf',
    };

    it('should call soaService.exportDocument, set headers, and send file buffer', async () => {
      const fileBuffer = Buffer.from('pdf-data');
      mockSOAService.exportDocument.mockResolvedValue({
        fileBuffer,
        mimeType: 'application/pdf',
        filename: 'soa-export.pdf',
      });
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportDocument(dto as never, res, 'org_123');

      expect(soaService.exportDocument).toHaveBeenCalledWith({
        ...dto,
        organizationId: 'org_123',
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="soa-export.pdf"',
      );
      expect(res.send).toHaveBeenCalledWith(fileBuffer);
    });

    it('should overwrite a body-supplied organizationId with the session organizationId', async () => {
      const spoofedDto = { ...dto, organizationId: 'org_victim' };
      mockSOAService.exportDocument.mockResolvedValue({
        fileBuffer: Buffer.from('pdf-data'),
        mimeType: 'application/pdf',
        filename: 'soa-export.pdf',
      });
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportDocument(spoofedDto as never, res, 'org_own');

      expect(soaService.exportDocument).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org_own' }),
      );
    });
  });
});
