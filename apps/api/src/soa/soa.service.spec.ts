import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '@db';
import { SOAService } from './soa.service';

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
    },
    sOADocument: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
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
  updateConfigurationWithResults: jest.fn(),
  updateDocumentAfterAutoFill: jest.fn(),
  getAnsweredCountFromConfiguration: jest.fn(),
  updateDocumentAnsweredCount: jest.fn(),
  checkIfFullyRemote: jest.fn(),
}));

const mockDb = jest.mocked(db);

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
      await expect(service.ensureSetup(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns success:false for non-ISO 27001 framework', async () => {
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
        id: 'fw-1',
        name: 'SOC 2',
      });
      const result = await service.ensureSetup(dto);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ISO 27001');
    });

    it('throws InternalServerErrorException when config creation fails', async () => {
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.frameworkEditorFramework.findFirst as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await expect(service.ensureSetup(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when document creation fails', async () => {
      const config = { id: 'cfg-1', questions: [] };
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock).mockResolvedValue(config);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.sOAFrameworkConfiguration.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );
      await expect(service.ensureSetup(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('returns existing document when setup already complete', async () => {
      const config = { id: 'cfg-1', questions: [{ id: 'q1' }] };
      const doc = { id: 'doc-1', answers: [] };
      (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
        id: 'fw-1',
        name: 'ISO 27001',
      });
      (mockDb.sOAFrameworkConfiguration.findFirst as jest.Mock).mockResolvedValue(config);
      (mockDb.sOADocument.findFirst as jest.Mock).mockResolvedValue(doc);
      const result = await service.ensureSetup(dto);
      expect(result.success).toBe(true);
      expect(result.configuration).toEqual(config);
      expect(result.document).toEqual(doc);
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
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
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
    });
  });
});
