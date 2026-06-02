import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsNarrativeService } from './isms-narrative.service';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn(), update: jest.fn() },
    ismsDocumentVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

const validScope = {
  certificateScopeSentence: 'The ISMS covers Acme.',
  inScope: 'Everything.',
  interfaces: ['Suppliers'],
  dependencies: ['Cloud'],
  exclusions: [],
};

describe('IsmsNarrativeService', () => {
  let service: IsmsNarrativeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsNarrativeService();
  });

  it('throws NotFoundException when document missing', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.save({
        documentId: 'doc_1',
        organizationId: 'org_1',
        narrative: validScope,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a register-type document that has no narrative schema', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'interested_parties_register',
    });
    await expect(
      service.save({
        documentId: 'doc_1',
        organizationId: 'org_1',
        narrative: validScope,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a narrative that fails zod validation', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
    });
    await expect(
      service.save({
        documentId: 'doc_1',
        organizationId: 'org_1',
        narrative: { certificateScopeSentence: 123 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a version when none exists', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
    });
    (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.ismsDocumentVersion.create as jest.Mock).mockResolvedValue({
      id: 'ver_1',
    });

    await service.save({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: validScope,
    });

    expect(mockDb.ismsDocumentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: 'doc_1', version: 1 }),
      }),
    );
  });

  it('updates the latest version when present', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
    });
    (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
      id: 'ver_1',
    });
    (mockDb.ismsDocumentVersion.update as jest.Mock).mockResolvedValue({
      id: 'ver_1',
    });

    await service.save({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: validScope,
    });

    expect(mockDb.ismsDocumentVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ver_1' } }),
    );
    expect(mockDb.ismsDocument.update).not.toHaveBeenCalled();
  });

  it('reverts an approved document to draft so it needs re-approval', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
      status: 'approved',
    });
    (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
      id: 'ver_1',
    });
    (mockDb.ismsDocumentVersion.update as jest.Mock).mockResolvedValue({
      id: 'ver_1',
    });

    await service.save({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: validScope,
    });

    expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: { status: 'draft', approvedAt: null, approverId: null },
    });
  });
});
