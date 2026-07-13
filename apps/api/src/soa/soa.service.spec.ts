import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '@db';
import { SOAService } from './soa.service';
import { generateSOAExportFile } from './utils/export-generator';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    sOAFrameworkConfiguration: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sOADocument: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    sOAAnswer: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('./utils/transform-iso-config', () => ({
  loadISOConfig: jest.fn(),
}));
jest.mock('./utils/soa-answer-generator', () => ({
  batchSearchSOAQuestions: jest.fn(),
  generateSOAAnswerWithRAG: jest.fn(),
  generateSOAControlAnswer: jest.fn(),
}));
jest.mock('./utils/soa-answer-parser', () => ({
  parseAndProcessSOAAnswer: jest.fn(),
  createDefaultYesResult: jest.fn(),
  createFullyRemoteResult: jest.fn(),
  isPhysicalSecurityControl: jest.fn(),
}));
jest.mock('./utils/soa-storage', () => ({
  saveAnswersToDatabase: jest.fn(),
  updateDocumentAfterAutoFill: jest.fn(),
  countAnsweredAnswers: jest.fn(),
  updateDocumentAnsweredCount: jest.fn(),
  checkIfFullyRemote: jest.fn(),
}));
jest.mock('./utils/export-generator', () => ({
  generateSOAExportFile: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockGenerateSOAExportFile = jest.mocked(generateSOAExportFile);

describe('SOAService', () => {
  let service: SOAService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SOAService();
  });

  describe('ensureSetup', () => {
    const dto = { frameworkId: 'fw-1', organizationId: 'org-1' };

    it('throws NotFoundException when framework not found', async () => {
      mockDb.frameworkEditorFramework.findUnique.mockResolvedValue(null);
      await expect(service.ensureSetup(dto)).rejects.toThrow(NotFoundException);
    });

    it('returns success:false for non-ISO 27001 framework', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'fw-1',
        name: 'SOC 2',
      });
      const result = await service.ensureSetup(dto);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ISO 27001');
    });

    it('throws InternalServerErrorException when config creation fails', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (
        mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        mockDb.frameworkEditorFramework.findFirst as jest.Mock
      ).mockRejectedValue(new Error('DB error'));
      await expect(service.ensureSetup(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when document creation fails', async () => {
      const config = { id: 'cfg-1', questions: [] };
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (
        mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock
      ).mockResolvedValue(config);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);
      (
        mockDb.sOAFrameworkConfiguration.findUnique as jest.Mock
      ).mockRejectedValue(new Error('DB error'));
      await expect(service.ensureSetup(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('returns existing document when setup already complete', async () => {
      const config = { id: 'cfg-1', questions: [{ id: 'q1' }] };
      const doc = { id: 'doc-1', answers: [] };
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (
        mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock
      ).mockResolvedValue(config);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(doc);
      const result = await service.ensureSetup(dto);
      expect(result.success).toBe(true);
      expect(result.configuration).toEqual(config);
      expect(result.document).toEqual(doc);
    });
  });

  describe('getSetup', () => {
    const dto = { frameworkId: 'fw-1', organizationId: 'org-1' };

    it('throws NotFoundException when framework not found', async () => {
      mockDb.frameworkEditorFramework.findUnique.mockResolvedValue(null);
      await expect(service.getSetup(dto)).rejects.toThrow(NotFoundException);
    });

    it('returns success:false for non-ISO 27001 framework', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'fw-1', name: 'SOC 2' });
      const result = await service.getSetup(dto);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ISO 27001');
    });

    it('returns nulls without creating when configuration and document are missing', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'fw-1', name: 'ISO 27001' });
      (
        mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSetup(dto);

      expect(result.success).toBe(true);
      expect(result.configuration).toBeNull();
      expect(result.document).toBeNull();
      expect(mockDb.sOAFrameworkConfiguration.create).not.toHaveBeenCalled();
      expect(mockDb.sOADocument.create).not.toHaveBeenCalled();
    });

    it('returns existing configuration and document without mutating', async () => {
      const config = { id: 'cfg-1', questions: [{ id: 'q1' }] };
      const doc = { id: 'doc-1', answers: [] };
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'fw-1', name: 'ISO 27001' });
      (
        mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock
      ).mockResolvedValue(config);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(doc);

      const result = await service.getSetup(dto);

      expect(result).toEqual({
        success: true,
        configuration: config,
        document: doc,
      });
      expect(mockDb.sOAFrameworkConfiguration.create).not.toHaveBeenCalled();
      expect(mockDb.sOADocument.create).not.toHaveBeenCalled();
    });
  });

  describe('approveDocument', () => {
    const dto = { documentId: 'doc-1', organizationId: 'org-1' };
    const userId = 'user-1';
    const ownerMember = { id: 'mem-1', role: 'owner' };

    it('throws NotFoundException when member not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.approveDocument(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not owner/admin', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        role: 'employee',
      });
      await expect(service.approveDocument(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when document not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.approveDocument(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when not pending approval for this user', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'other-member',
        status: 'needs_review',
      });
      await expect(service.approveDocument(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when not in needs_review status', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'mem-1',
        status: 'draft',
      });
      await expect(service.approveDocument(dto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('approves document successfully', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'mem-1',
        status: 'needs_review',
      });
      (mockDb.sOADocument.update as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'completed',
      });
      const result = await service.approveDocument(dto, userId);
      expect(result.success).toBe(true);
      expect(mockDb.sOADocument.update).toHaveBeenCalledWith({
        where: { id: dto.documentId },
        data: expect.objectContaining({
          status: 'completed',
          declinedAt: null,
        }),
      });
    });
  });

  describe('declineDocument', () => {
    const dto = {
      documentId: 'doc-1',
      organizationId: 'org-1',
      reason: 'Needs changes',
    };
    const userId = 'user-1';
    const ownerMember = { id: 'mem-1', role: 'owner' };

    it('throws NotFoundException when member not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.declineDocument(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not owner/admin', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        role: 'employee',
      });

      await expect(service.declineDocument(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when document not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.declineDocument(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when not pending approval for this user', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'other-member',
        status: 'needs_review',
      });

      await expect(service.declineDocument(dto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when not in needs_review status', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'mem-1',
        status: 'draft',
      });

      await expect(service.declineDocument(dto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('declines document and sets declinedAt', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(ownerMember);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        approverId: 'mem-1',
        status: 'needs_review',
      });
      (mockDb.sOADocument.update as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'completed',
      });

      const result = await service.declineDocument(dto, userId);

      expect(result.success).toBe(true);
      expect(mockDb.sOADocument.update).toHaveBeenCalledWith({
        where: { id: dto.documentId },
        data: expect.objectContaining({
          approverId: null,
          approvedAt: null,
          status: 'completed',
        }),
      });
      expect(
        (mockDb.sOADocument.update as jest.Mock).mock.calls[0][0].data
          .declinedAt,
      ).toBeInstanceOf(Date);
    });
  });

  describe('submitForApproval', () => {
    const dto = {
      documentId: 'doc-1',
      organizationId: 'org-1',
      approverId: 'mem-1',
    };

    it('throws NotFoundException when approver not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.submitForApproval(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when approver is not owner/admin', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'employee',
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ role: 'user' });
      await expect(service.submitForApproval(dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when approver is platform admin', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'admin',
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'admin',
      });
      await expect(service.submitForApproval(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when document not found', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'admin',
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ role: 'user' });
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.submitForApproval(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when already pending approval', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'admin',
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ role: 'user' });
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'needs_review',
      });
      await expect(service.submitForApproval(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('submits for approval successfully', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'owner',
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ role: 'user' });
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'draft',
      });
      (mockDb.sOADocument.update as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'needs_review',
      });
      const result = await service.submitForApproval(dto);
      expect(result.success).toBe(true);
      expect(mockDb.sOADocument.update).toHaveBeenCalledWith({
        where: { id: dto.documentId },
        data: expect.objectContaining({
          approverId: dto.approverId,
          status: 'needs_review',
          approvedAt: null,
          declinedAt: null,
        }),
      });
    });
  });

  describe('exportDocument', () => {
    const dto = {
      documentId: 'doc-1',
      organizationId: 'org-1',
      format: 'pdf' as const,
    };

    it('throws NotFoundException when document not found', async () => {
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.exportDocument(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sources applicability + justification from this org\'s answers, not the shared configuration', async () => {
      const generated = {
        fileBuffer: Buffer.from('pdf'),
        mimeType: 'application/pdf',
        filename: 'statement-of-applicability-iso-27001-v2.pdf',
      };
      mockGenerateSOAExportFile.mockReturnValue(generated);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        organizationId: 'org-1',
        preparedBy: 'Compliance Lead',
        answeredQuestions: 3,
        totalQuestions: 5,
        approvedAt: null,
        declinedAt: new Date('2026-04-20T00:00:00.000Z'),
        status: 'declined',
        version: 2,
        framework: { name: 'ISO 27001' },
        configuration: {
          // The shared configuration must NOT drive applicability/justification.
          // These stale values would previously bleed into every org's export.
          questions: [
            {
              id: 'q-1',
              text: 'Control 1',
              columnMapping: {
                closure: 'A.5',
                title: 'Control title',
                control_objective: 'Objective',
                isApplicable: true,
                justification: 'Another org shared-config justification',
              },
            },
            {
              id: 'q-2',
              text: 'Control 2',
              columnMapping: {},
            },
          ],
        },
        approver: {
          user: {
            name: 'Approver Name',
            email: 'approver@example.com',
          },
        },
        // This org's own answers.
        answers: [
          {
            questionId: 'q-1',
            answer: 'Our own justification',
            isApplicable: false,
          },
        ],
      });

      const result = await service.exportDocument(dto);

      expect(mockGenerateSOAExportFile).toHaveBeenCalledWith(
        [
          {
            id: 'q-1',
            text: 'Control 1',
            columnMapping: {
              closure: 'A.5',
              title: 'Control title',
              control_objective: 'Objective',
              // From the org's own answer — NOT the shared config's `true`.
              isApplicable: false,
              justification: 'Our own justification',
            },
            answer: 'Our own justification',
          },
          {
            id: 'q-2',
            text: 'Control 2',
            columnMapping: {
              closure: null,
              title: null,
              control_objective: null,
              // No answer for this org → blank, not another org's data.
              isApplicable: null,
              justification: null,
            },
            answer: null,
          },
        ],
        'ISO 27001',
        2,
        {
          preparedBy: 'Compliance Lead',
          answeredQuestions: 3,
          totalQuestions: 5,
          approvedAt: null,
          declinedAt: new Date('2026-04-20T00:00:00.000Z'),
          status: 'declined',
          approverName: 'Approver Name',
        },
        'pdf',
      );
      expect(result).toEqual(generated);
    });
  });

  describe('saveAnswer', () => {
    const baseDto = {
      organizationId: 'org-1',
      documentId: 'doc-1',
      questionId: 'q-1',
    };
    const userId = 'user-1';

    beforeEach(() => {
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        totalQuestions: 5,
        configuration: { questions: [{ id: 'q-1' }] },
      });
      (mockDb.sOAAnswer.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.sOAAnswer.create as jest.Mock).mockResolvedValue({ id: 'ans-1' });
    });

    it('throws NotFoundException when document not found', async () => {
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.saveAnswer(
          { ...baseDto, isApplicable: true, justification: 'x' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a question that is not in the document configuration', async () => {
      await expect(
        service.saveAnswer(
          {
            ...baseDto,
            questionId: 'q-not-in-config',
            isApplicable: true,
            justification: 'x',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.sOAAnswer.create).not.toHaveBeenCalled();
    });

    it('requires a justification when a control is not applicable', async () => {
      await expect(
        service.saveAnswer(
          { ...baseDto, isApplicable: false, justification: '   ' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.sOAAnswer.create).not.toHaveBeenCalled();
    });

    it('preserves the existing applicability when isApplicable is omitted', async () => {
      (mockDb.sOAAnswer.findFirst as jest.Mock).mockResolvedValue({
        id: 'ans-prev',
        answerVersion: 1,
        isApplicable: false,
        answer: 'Prior justification',
      });

      // A partial edit that only sends a justification must not wipe the Yes/No.
      await service.saveAnswer(
        { ...baseDto, justification: 'Updated justification' },
        userId,
      );

      expect(mockDb.sOAAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isApplicable: false,
          answer: 'Updated justification',
        }),
      });
    });

    it('persists applicability + justification on the answer', async () => {
      await service.saveAnswer(
        {
          ...baseDto,
          isApplicable: false,
          justification: 'Not applicable because reasons',
        },
        userId,
      );

      expect(mockDb.sOAAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc-1',
          questionId: 'q-1',
          answer: 'Not applicable because reasons',
          isApplicable: false,
          status: 'manual',
          isLatestAnswer: true,
        }),
      });
    });

    it('keeps the justification for applicable (YES) answers', async () => {
      await service.saveAnswer(
        { ...baseDto, isApplicable: true, justification: 'We do this' },
        userId,
      );

      expect(mockDb.sOAAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          answer: 'We do this',
          isApplicable: true,
        }),
      });
    });

    it('never writes per-organization data to the shared configuration', async () => {
      await service.saveAnswer(
        { ...baseDto, isApplicable: true, justification: 'We do this' },
        userId,
      );

      expect(mockDb.sOAFrameworkConfiguration.update).not.toHaveBeenCalled();
    });
  });
});
