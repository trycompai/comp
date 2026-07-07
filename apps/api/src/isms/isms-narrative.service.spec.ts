import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsNarrativeService } from './isms-narrative.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    // Run the callback with the same mock as the transaction client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

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
    (mockDb.ismsDocument.update as jest.Mock).mockResolvedValue({
      id: 'doc_1',
    });
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

  it('writes the validated narrative onto the document draft (CS-701)', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
    });
    // Non-approved: invalidateApprovalIfNeeded is a no-op.
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'draft',
    });

    await service.save({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: validScope,
    });

    // The draft narrative lives on IsmsDocument, never on a version row.
    expect(mockDb.ismsDocument.update).toHaveBeenCalledTimes(1);
    expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: {
        draftNarrative: expect.objectContaining({
          certificateScopeSentence: 'The ISMS covers Acme.',
        }),
      },
      select: { id: true, draftNarrative: true },
    });
  });

  it('reverts an approved document to draft, then writes the narrative', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
      type: 'isms_scope',
    });
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
      status: 'approved',
    });

    await service.save({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: validScope,
    });

    // First the approval invalidation, then the narrative write — both in-tx.
    expect(mockDb.ismsDocument.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'doc_1' },
      data: { status: 'draft', approvedAt: null, approverId: null },
    });
    expect(mockDb.ismsDocument.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'doc_1' },
      data: {
        draftNarrative: expect.objectContaining({
          certificateScopeSentence: 'The ISMS covers Acme.',
        }),
      },
      select: { id: true, draftNarrative: true },
    });
  });
});
