import { NotFoundException } from '@nestjs/common';

// ------- Mock archiver -------
// Collect append() calls on a simple harness. finalize() resolves a shared
// deferred so tests can await populate completion.
interface MockArchive {
  appendCalls: Array<{ source: unknown; options: { name: string } }>;
  append: jest.Mock;
  finalize: jest.Mock;
  abort: jest.Mock;
  on: jest.Mock;
  pipe: jest.Mock;
  finalized: Promise<void>;
  aborted: boolean;
}

const archiveInstances: MockArchive[] = [];

function createMockArchive(): MockArchive {
  let resolveFinalized!: () => void;
  let rejectFinalized!: (err: Error) => void;
  const finalized = new Promise<void>((resolve, reject) => {
    resolveFinalized = resolve;
    rejectFinalized = reject;
  });

  const archive: MockArchive = {
    appendCalls: [],
    append: jest.fn((source, options) => {
      archive.appendCalls.push({ source, options });
      return archive;
    }),
    finalize: jest.fn(async () => {
      resolveFinalized();
    }),
    abort: jest.fn(() => {
      archive.aborted = true;
      rejectFinalized(new Error('aborted'));
    }),
    on: jest.fn(() => archive),
    pipe: jest.fn(() => archive),
    finalized,
    aborted: false,
  };
  return archive;
}

jest.mock('archiver', () => {
  return jest.fn(() => {
    const instance = createMockArchive();
    archiveInstances.push(instance);
    return instance;
  });
});

// ------- Mock S3 -------
jest.mock('../../app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: {
    send: jest.fn(),
  },
  getSignedUrl: jest.fn(),
}));

// ------- Mock @db -------
const mockDb = {
  task: { findFirst: jest.fn(), findMany: jest.fn() },
  integrationCheckRun: { findMany: jest.fn() },
  evidenceAutomationRun: { findMany: jest.fn() },
  attachment: { findMany: jest.fn() },
  organization: { findUnique: jest.fn() },
};

jest.mock('@db', () => ({
  db: mockDb,
  AttachmentEntityType: {
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    comment: 'comment',
    trust_nda: 'trust_nda',
    task_item: 'task_item',
  },
}));

// ------- Mock PDF generator to avoid heavy jsPDF work -------
jest.mock('./evidence-pdf-generator', () => ({
  generateTaskSummaryPDF: jest.fn(() => Buffer.from('SUMMARY-PDF')),
  generateAutomationPDF: jest.fn(() => Buffer.from('AUTOMATION-PDF')),
  sanitizeFilename: (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'export',
}));

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../app/s3';
import { EvidenceExportService } from './evidence-export.service';
import { generateTaskSummaryPDF } from './evidence-pdf-generator';

describe('EvidenceExportService — streaming ZIPs', () => {
  let service: EvidenceExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    archiveInstances.length = 0;
    service = new EvidenceExportService();
  });

  const taskRow = {
    id: 'tsk_123',
    title: 'SOC 2 — Access Review',
    organization: { name: 'Acme Corp' },
  };

  function primeTaskQueries({
    attachments = [] as Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      createdAt: Date;
    }>,
    appRuns = [] as unknown[],
    customRuns = [] as unknown[],
  }) {
    mockDb.task.findFirst.mockResolvedValue(taskRow);
    mockDb.integrationCheckRun.findMany.mockResolvedValue(appRuns);
    mockDb.evidenceAutomationRun.findMany.mockResolvedValue(customRuns);
    mockDb.attachment.findMany.mockResolvedValue(attachments);
  }

  describe('streamTaskEvidenceZip', () => {
    it('throws NotFoundException when task does not exist', async () => {
      mockDb.task.findFirst.mockResolvedValue(null);

      await expect(
        service.streamTaskEvidenceZip('org_1', 'tsk_missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a filename scoped to org + task + date', async () => {
      primeTaskQueries({});

      const { filename } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );

      expect(filename).toMatch(
        /^acme-corp_soc-2-access-review_evidence_\d{4}-\d{2}-\d{2}\.zip$/,
      );
    });

    it('appends summary PDF then attachments (ordered before automations)', async () => {
      const attachments = [
        {
          id: 'att_1',
          name: 'contract.pdf',
          url: 'org_1/attachments/task/tsk_123/123-abc-contract.pdf',
          type: 'document',
          createdAt: new Date('2024-01-01'),
        },
      ];

      // Mock S3 GetObject to return a small Buffer body
      (s3Client!.send as jest.Mock).mockResolvedValue({
        Body: Buffer.from('FAKE-PDF-BYTES'),
      });

      primeTaskQueries({ attachments });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);
      expect(paths[0]).toBe(
        'acme-corp_soc-2-access-review_evidence/00-summary.pdf',
      );
      expect(paths[1]).toBe(
        'acme-corp_soc-2-access-review_evidence/01-attachments/contract.pdf',
      );

      // S3 hit with attachment's S3 key
      expect(s3Client!.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand),
      );

      // Summary PDF rendered with attachment count
      expect(generateTaskSummaryPDF).toHaveBeenCalledWith(
        expect.any(Object),
        { attachmentsCount: 1 },
      );
    });

    it('writes a placeholder when S3 object is truly missing (NoSuchKey)', async () => {
      const attachments = [
        {
          id: 'att_missing',
          name: 'ghost.pdf',
          url: 'org_1/attachments/task/tsk_123/missing-ghost.pdf',
          type: 'document',
          createdAt: new Date(),
        },
      ];

      const noSuchKeyError = Object.assign(new Error('NoSuchKey'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      });
      (s3Client!.send as jest.Mock).mockRejectedValue(noSuchKeyError);
      primeTaskQueries({ attachments });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const placeholder = mock.appendCalls.find((c) =>
        c.options.name.includes('_MISSING_'),
      );
      expect(placeholder).toBeDefined();
      expect(placeholder!.options.name).toMatch(/_MISSING_ghost\.pdf\.txt$/);
      expect(String(placeholder!.source)).toContain('att_missing');
    });

    it('aborts the archive on transient S3 failures (not a placeholder)', async () => {
      const attachments = [
        {
          id: 'att_err',
          name: 'file.pdf',
          url: 'org_1/attachments/task/tsk_123/file.pdf',
          type: 'document',
          createdAt: new Date(),
        },
      ];

      // AccessDenied — NOT a missing-object error; must surface as a failure.
      const accessDeniedError = Object.assign(new Error('Access Denied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });
      (s3Client!.send as jest.Mock).mockRejectedValue(accessDeniedError);
      primeTaskQueries({ attachments });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;

      await expect(mock.finalized).rejects.toThrow('aborted');
      expect(mock.abort).toHaveBeenCalled();

      // No placeholder text file written for a non-missing error
      const placeholder = mock.appendCalls.find((c) =>
        c.options.name.includes('_MISSING_'),
      );
      expect(placeholder).toBeUndefined();
    });

    it('disambiguates duplicate filenames within attachments folder', async () => {
      const attachments = [
        {
          id: 'att_a',
          name: 'report.pdf',
          url: 'key-a',
          type: 'document',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'att_b',
          name: 'report.pdf',
          url: 'key-b',
          type: 'document',
          createdAt: new Date('2024-01-02'),
        },
      ];

      (s3Client!.send as jest.Mock).mockResolvedValue({
        Body: Buffer.from('PDF'),
      });
      primeTaskQueries({ attachments });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const attachmentPaths = mock.appendCalls
        .map((c) => c.options.name)
        .filter((p) => p.includes('/01-attachments/'));

      expect(attachmentPaths).toHaveLength(2);
      expect(attachmentPaths[0]).toMatch(/\/report\.pdf$/);
      expect(attachmentPaths[1]).toMatch(/\/report \(1\)\.pdf$/);
    });

    it('queries only task-entity attachments (not vendor/risk/comment)', async () => {
      primeTaskQueries({});
      await service.streamTaskEvidenceZip('org_1', 'tsk_123');
      const mock = archiveInstances[0];
      await mock.finalized;

      expect(mockDb.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org_1',
            entityType: 'task',
            entityId: 'tsk_123',
          }),
        }),
      );
    });
  });

  describe('streamOrganizationEvidenceZip', () => {
    it('throws NotFoundException when organization does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.streamOrganizationEvidenceZip('org_missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException synchronously (pre-flight) when no tasks have content', async () => {
      // Org exists but no tasks with automations and no attachments.
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.task.findMany.mockResolvedValue([]);
      mockDb.attachment.findMany.mockResolvedValue([]);

      // Must reject synchronously — before an archive is returned — so the
      // controller can produce a real HTTP 404 instead of a broken streamed ZIP.
      await expect(
        service.streamOrganizationEvidenceZip('org_1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      // No archive should have been created at all.
      expect(archiveInstances).toHaveLength(0);
    });

    it('includes a task that has attachments but no automations', async () => {
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' });
      // findTasksWithEvidence: one has runs, one is distinct attachments-only
      mockDb.task.findMany.mockResolvedValue([]);
      mockDb.attachment.findMany
        // First call: findTasksWithEvidence's distinct entityIds
        .mockResolvedValueOnce([{ entityId: 'tsk_att_only' }])
        // Next calls: getTaskAttachments per task
        .mockResolvedValue([
          {
            id: 'att_1',
            name: 'audit.pdf',
            url: 'key',
            type: 'document',
            createdAt: new Date(),
          },
        ]);
      mockDb.task.findFirst.mockResolvedValue({
        id: 'tsk_att_only',
        title: 'Attachments Only Task',
        organization: { name: 'Acme Corp' },
      });
      mockDb.integrationCheckRun.findMany.mockResolvedValue([]);
      mockDb.evidenceAutomationRun.findMany.mockResolvedValue([]);
      (s3Client!.send as jest.Mock).mockResolvedValue({
        Body: Buffer.from('PDF'),
      });

      const { archive, filename } =
        await service.streamOrganizationEvidenceZip('org_1');
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      expect(filename).toMatch(/^acme-corp_all-evidence_\d{4}-\d{2}-\d{2}\.zip$/);

      const paths = mock.appendCalls.map((c) => c.options.name);
      expect(paths.some((p) => p.endsWith('/manifest.json'))).toBe(true);
      expect(paths.some((p) => p.includes('/01-attachments/audit.pdf'))).toBe(
        true,
      );
    });
  });
});
