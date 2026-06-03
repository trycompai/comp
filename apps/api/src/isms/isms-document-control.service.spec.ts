import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsDocumentControlService } from './isms-document-control.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    // Run the callback with the same mock as the transaction client.
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

describe('IsmsDocumentControlService', () => {
  let service: IsmsDocumentControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsDocumentControlService();
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc_1',
    });
    (mockDb.control.findMany as jest.Mock).mockResolvedValue([
      { id: 'ctl_1' },
      { id: 'ctl_2' },
    ]);
    (mockDb.ismsDocumentControlLink.createMany as jest.Mock).mockResolvedValue({
      count: 2,
    });
    (mockDb.ismsDocumentControlLink.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
  });

  describe('addControls', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      controlIds: ['ctl_1', 'ctl_2'],
    };

    it('throws NotFoundException when the document is not in the org', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.addControls(args)).rejects.toThrow(NotFoundException);
    });

    it('rejects controls that do not belong to the org', async () => {
      (mockDb.control.findMany as jest.Mock).mockResolvedValue([
        { id: 'ctl_1' },
      ]);
      await expect(service.addControls(args)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.ismsDocumentControlLink.createMany).not.toHaveBeenCalled();
    });

    it('verifies controls are org-scoped', async () => {
      await service.addControls(args);
      expect(mockDb.control.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['ctl_1', 'ctl_2'] }, organizationId: 'org_1' },
        select: { id: true },
      });
    });

    it('creates links idempotently and de-duplicates input', async () => {
      await service.addControls({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlIds: ['ctl_1', 'ctl_1', 'ctl_2'],
      });

      expect(mockDb.ismsDocumentControlLink.createMany).toHaveBeenCalledWith({
        data: [
          { ismsDocumentId: 'doc_1', controlId: 'ctl_1' },
          { ismsDocumentId: 'doc_1', controlId: 'ctl_2' },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('removeControl', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      controlId: 'ctl_1',
    };

    it('throws NotFoundException when the document is not in the org', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.removeControl(args)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the link scoped to the document', async () => {
      await service.removeControl(args);
      expect(mockDb.ismsDocumentControlLink.deleteMany).toHaveBeenCalledWith({
        where: { ismsDocumentId: 'doc_1', controlId: 'ctl_1' },
      });
    });
  });

  describe('approval invalidation', () => {
    it('reverts an approved document to draft on control add', async () => {
      (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
        status: 'approved',
      });

      await service.addControls({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlIds: ['ctl_1', 'ctl_2'],
      });

      expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: { status: 'draft', approvedAt: null, approverId: null },
      });
    });

    it('reverts an approved document to draft on control remove', async () => {
      (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
        status: 'approved',
      });

      await service.removeControl({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlId: 'ctl_1',
      });

      expect(mockDb.ismsDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: { status: 'draft', approvedAt: null, approverId: null },
      });
    });

    it('leaves a draft document untouched on control add', async () => {
      (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
        status: 'draft',
      });

      await service.addControls({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlIds: ['ctl_1', 'ctl_2'],
      });

      expect(mockDb.ismsDocument.update).not.toHaveBeenCalled();
    });

    it('does not invalidate an approved document on an idempotent add (no rows inserted)', async () => {
      (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
        status: 'approved',
      });
      // createMany inserts nothing because the links already exist.
      (mockDb.ismsDocumentControlLink.createMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await service.addControls({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlIds: ['ctl_1', 'ctl_2'],
      });

      expect(mockDb.ismsDocument.update).not.toHaveBeenCalled();
    });

    it('does not invalidate an approved document on a no-op remove (no rows deleted)', async () => {
      (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({
        status: 'approved',
      });
      (mockDb.ismsDocumentControlLink.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await service.removeControl({
        documentId: 'doc_1',
        organizationId: 'org_1',
        controlId: 'ctl_1',
      });

      expect(mockDb.ismsDocument.update).not.toHaveBeenCalled();
    });
  });
});
