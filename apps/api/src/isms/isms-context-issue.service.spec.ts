import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsContextIssueService } from './isms-context-issue.service';

jest.mock('@db', () => ({
  db: {
    ismsDocument: { findFirst: jest.fn() },
    ismsContextIssue: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

describe('IsmsContextIssueService', () => {
  let service: IsmsContextIssueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsContextIssueService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { kind: 'internal' as const, description: 'd', effect: 'e' },
    };

    it('throws NotFoundException when document missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });

    it('creates a manual issue with the next position', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({
        id: 'doc_1',
      });
      (mockDb.ismsContextIssue.count as jest.Mock).mockResolvedValue(3);
      (mockDb.ismsContextIssue.create as jest.Mock).mockResolvedValue({
        id: 'ci_1',
      });

      await service.create(args);

      expect(mockDb.ismsContextIssue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc_1',
          source: 'manual',
          position: 3,
        }),
      });
    });
  });

  describe('update', () => {
    const args = {
      issueId: 'ci_1',
      organizationId: 'org_1',
      dto: { description: 'updated' },
    };

    it('throws NotFoundException when issue not in org', async () => {
      (mockDb.ismsContextIssue.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.update(args)).rejects.toThrow(NotFoundException);
    });

    it('flips a derived row to manual on edit (override)', async () => {
      (mockDb.ismsContextIssue.findFirst as jest.Mock).mockResolvedValue({
        id: 'ci_1',
        source: 'derived',
      });
      (mockDb.ismsContextIssue.update as jest.Mock).mockResolvedValue({
        id: 'ci_1',
      });

      await service.update(args);

      expect(mockDb.ismsContextIssue.update).toHaveBeenCalledWith({
        where: { id: 'ci_1' },
        data: expect.objectContaining({
          description: 'updated',
          source: 'manual',
        }),
      });
    });

    it('scopes the lookup by organization', async () => {
      (mockDb.ismsContextIssue.findFirst as jest.Mock).mockResolvedValue({
        id: 'ci_1',
        source: 'manual',
      });
      (mockDb.ismsContextIssue.update as jest.Mock).mockResolvedValue({});

      await service.update(args);

      expect(mockDb.ismsContextIssue.findFirst).toHaveBeenCalledWith({
        where: { id: 'ci_1', document: { organizationId: 'org_1' } },
      });
    });
  });

  describe('remove', () => {
    const args = { issueId: 'ci_1', organizationId: 'org_1' };

    it('throws NotFoundException when issue not in org', async () => {
      (mockDb.ismsContextIssue.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(args)).rejects.toThrow(NotFoundException);
    });

    it('deletes the issue', async () => {
      (mockDb.ismsContextIssue.findFirst as jest.Mock).mockResolvedValue({
        id: 'ci_1',
      });
      (mockDb.ismsContextIssue.delete as jest.Mock).mockResolvedValue({});

      const result = await service.remove(args);

      expect(mockDb.ismsContextIssue.delete).toHaveBeenCalledWith({
        where: { id: 'ci_1' },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
