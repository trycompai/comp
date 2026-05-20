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

    it('aborts on NoSuchBucket (a 404 that is NOT a missing object)', async () => {
      const attachments = [
        {
          id: 'att_bucket',
          name: 'file.pdf',
          url: 'org_1/attachments/task/tsk_123/file.pdf',
          type: 'document',
          createdAt: new Date(),
        },
      ];

      // Bucket misconfiguration — returns HTTP 404 but must NOT be
      // treated as a single missing attachment. Otherwise the export looks
      // "successful" while silently containing only placeholders.
      const noSuchBucketError = Object.assign(new Error('NoSuchBucket'), {
        name: 'NoSuchBucket',
        $metadata: { httpStatusCode: 404 },
      });
      (s3Client!.send as jest.Mock).mockRejectedValue(noSuchBucketError);
      primeTaskQueries({ attachments });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;

      await expect(mock.finalized).rejects.toThrow('aborted');
      expect(mock.abort).toHaveBeenCalled();

      const placeholder = mock.appendCalls.find((c) =>
        c.options.name.includes('_MISSING_'),
      );
      expect(placeholder).toBeUndefined();
    });

    it('prevents placeholder vs success filename collision in final ZIP path', async () => {
      // Regression guard for cubic P2: if a legitimate file is uploaded with
      // the name `_MISSING_foo.txt` and succeeds from S3, AND another upload
      // named `foo` fails (NoSuchKey), the wrapping of the failure into
      // `_MISSING_foo.txt` must NOT collide with the successful file.
      const attachments = [
        {
          id: 'att_real',
          name: '_MISSING_foo.txt',
          url: 'key-real',
          type: 'document',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'att_miss',
          name: 'foo',
          url: 'key-miss',
          type: 'document',
          createdAt: new Date('2024-01-02'),
        },
      ];

      (s3Client!.send as jest.Mock).mockImplementation(
        (cmd: { input: { Key: string } }) => {
          if (cmd.input.Key === 'key-real') {
            return Promise.resolve({ Body: Buffer.from('REAL') });
          }
          return Promise.reject(
            Object.assign(new Error('NoSuchKey'), {
              name: 'NoSuchKey',
              $metadata: { httpStatusCode: 404 },
            }),
          );
        },
      );
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

      // Two entries, each with a distinct final path inside the ZIP.
      expect(attachmentPaths).toHaveLength(2);
      const uniquePaths = new Set(attachmentPaths);
      expect(uniquePaths.size).toBe(2);

      // The real file keeps its name; the placeholder gets a numeric suffix
      // because the tracker now dedupes on the final ZIP entry name.
      expect(attachmentPaths).toContain(
        'acme-corp_soc-2-access-review_evidence/01-attachments/_MISSING_foo.txt',
      );
      expect(attachmentPaths).toContain(
        'acme-corp_soc-2-access-review_evidence/01-attachments/_MISSING_foo (1).txt',
      );
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

    it('produces a valid ZIP with automations only (no attachments) — no regression', async () => {
      // Simulates the common case: task has automation runs but no files
      // uploaded. Must NOT create an empty 01-attachments/ folder and must
      // still emit the summary + automation PDFs like before this PR.
      const appRun = {
        id: 'icr_1',
        checkId: 'mfa-check',
        checkName: 'MFA Enabled',
        status: 'success',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:00:05Z'),
        durationMs: 5000,
        totalChecked: 1,
        passedCount: 1,
        failedCount: 0,
        errorMessage: null,
        logs: null,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        connection: { provider: { slug: 'g', name: 'G' } },
        results: [],
      };
      primeTaskQueries({ attachments: [], appRuns: [appRun], customRuns: [] });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);

      // Summary PDF present
      expect(paths).toContain(
        'acme-corp_soc-2-access-review_evidence/00-summary.pdf',
      );
      // No 01-attachments/ folder at all
      expect(paths.some((p) => p.includes('/01-attachments/'))).toBe(false);
      // At least one automation PDF was written in a subfolder (per-task uses subfolders)
      expect(paths.some((p) => /\/app-.+\/evidence\.pdf$/.test(p))).toBe(true);

      // S3 GetObject should NOT have been called — no attachments to fetch.
      expect(s3Client!.send).not.toHaveBeenCalled();

      // Summary PDF renders with attachmentsCount=0 (line omitted in PDF).
      expect(generateTaskSummaryPDF).toHaveBeenCalledWith(
        expect.any(Object),
        { attachmentsCount: 0 },
      );
    });

    it('loads each automation individually instead of all runs at once (OOM fix)', async () => {
      const appRuns = [
        {
          id: 'icr_1',
          checkId: 'mfa-check',
          checkName: 'MFA Enabled',
          status: 'success',
          startedAt: new Date('2024-01-15'),
          completedAt: new Date('2024-01-15'),
          durationMs: 5000,
          totalChecked: 1,
          passedCount: 1,
          failedCount: 0,
          errorMessage: null,
          logs: { entries: ['checked MFA'] },
          createdAt: new Date('2024-01-15'),
          connection: { provider: { slug: 'gws', name: 'Google Workspace' } },
          results: [
            {
              id: 'r1',
              passed: true,
              resourceType: 'user',
              resourceId: 'u1',
              title: 'MFA active',
              description: null,
              severity: null,
              remediation: null,
              evidence: { mfa: true },
              collectedAt: new Date(),
            },
          ],
        },
        {
          id: 'icr_2',
          checkId: 'access-review',
          checkName: 'Access Review',
          status: 'success',
          startedAt: new Date('2024-01-16'),
          completedAt: new Date('2024-01-16'),
          durationMs: 3000,
          totalChecked: 2,
          passedCount: 2,
          failedCount: 0,
          errorMessage: null,
          logs: null,
          createdAt: new Date('2024-01-16'),
          connection: { provider: { slug: 'gws', name: 'Google Workspace' } },
          results: [],
        },
      ];

      mockDb.task.findFirst.mockResolvedValue(taskRow);
      mockDb.attachment.findMany.mockResolvedValue([]);
      mockDb.evidenceAutomationRun.findMany.mockResolvedValue([]);
      mockDb.integrationCheckRun.findMany.mockImplementation(
        (args: { where: { checkId?: string } }) => {
          if (args.where.checkId) {
            return Promise.resolve(
              appRuns.filter((r) => r.checkId === args.where.checkId),
            );
          }
          return Promise.resolve(appRuns);
        },
      );

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);

      // Both automations get their own subfolder and PDF
      expect(paths.filter((p) => /\/evidence\.pdf$/.test(p))).toHaveLength(2);
      expect(paths.some((p) => p.includes('/app-mfa-enabled-'))).toBe(true);
      expect(paths.some((p) => p.includes('/app-access-review-'))).toBe(true);

      // Verify per-automation loading: findMany is called with individual
      // checkId filters (not a single bulk load of all results).
      const findManyCalls = mockDb.integrationCheckRun.findMany.mock.calls;
      const perAutomationCalls = findManyCalls.filter(
        (call: unknown[]) =>
          (call[0] as { where: { checkId?: string } }).where.checkId,
      );
      expect(perAutomationCalls).toHaveLength(2);
      const loadedCheckIds = perAutomationCalls.map(
        (call: unknown[]) =>
          (call[0] as { where: { checkId: string } }).where.checkId,
      );
      expect(loadedCheckIds).toContain('mfa-check');
      expect(loadedCheckIds).toContain('access-review');
    });

    it('produces a summary-only ZIP when task has neither automations nor attachments', async () => {
      primeTaskQueries({ attachments: [], appRuns: [], customRuns: [] });

      const { archive } = await service.streamTaskEvidenceZip(
        'org_1',
        'tsk_123',
      );
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);
      expect(paths).toEqual([
        'acme-corp_soc-2-access-review_evidence/00-summary.pdf',
      ]);
      expect(s3Client!.send).not.toHaveBeenCalled();
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

    it('works for an org with automations but zero attachments anywhere — no regression', async () => {
      // Core pre-existing behaviour: org has tasks with automation runs, no
      // attachments uploaded. Export must succeed with the same structure as
      // before this PR (manifest + per-task folders with automation PDFs,
      // no 01-attachments/ folders, totalAttachments: 0).
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' });

      // findTasksWithEvidence: one task has runs, attachments query returns empty
      mockDb.task.findMany.mockResolvedValue([{ id: 'tsk_auto' }]);
      mockDb.attachment.findMany.mockResolvedValueOnce([]); // no tasks with attachments

      // Per-task fetches inside populate loop
      mockDb.task.findFirst.mockResolvedValue({
        id: 'tsk_auto',
        title: 'Automated Task',
        organization: { name: 'Acme Corp' },
      });
      mockDb.integrationCheckRun.findMany.mockResolvedValue([
        {
          id: 'icr_1',
          checkId: 'c1',
          checkName: 'Check 1',
          status: 'success',
          startedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-01'),
          durationMs: 100,
          totalChecked: 1,
          passedCount: 1,
          failedCount: 0,
          errorMessage: null,
          logs: null,
          createdAt: new Date('2024-01-01'),
          connection: { provider: { slug: 'g', name: 'G' } },
          results: [],
        },
      ]);
      mockDb.evidenceAutomationRun.findMany.mockResolvedValue([]);
      // Per-task attachment fetch inside loop
      mockDb.attachment.findMany.mockResolvedValue([]);

      const { archive } =
        await service.streamOrganizationEvidenceZip('org_1');
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);

      // Manifest present, task folder with summary + automation PDF present,
      // no 01-attachments/ folder anywhere.
      expect(paths.some((p) => p.endsWith('/manifest.json'))).toBe(true);
      expect(paths.some((p) => p.endsWith('/00-summary.pdf'))).toBe(true);
      expect(paths.some((p) => /\/app-.+\.pdf$/.test(p))).toBe(true);
      expect(paths.some((p) => p.includes('/01-attachments/'))).toBe(false);

      // No S3 fetches triggered (no attachments to stream)
      expect(s3Client!.send).not.toHaveBeenCalled();

      // Manifest should record zero attachments
      const manifestCall = mock.appendCalls.find((c) =>
        c.options.name.endsWith('/manifest.json'),
      );
      expect(manifestCall).toBeDefined();
      const manifestJson = JSON.parse(String(manifestCall!.source));
      expect(manifestJson.totalAttachments).toBe(0);
      expect(manifestJson.tasksCount).toBe(1);
      expect(manifestJson.tasks[0]).toMatchObject({
        title: 'Automated Task',
        automations: 1,
        attachments: 0,
      });
    });

    it('mixes attachment-only and automation-only tasks in the same export', async () => {
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' });

      // findTasksWithEvidence: one task has runs, another has only attachments
      mockDb.task.findMany.mockResolvedValue([{ id: 'tsk_auto' }]);
      mockDb.attachment.findMany.mockResolvedValueOnce([
        { entityId: 'tsk_att' },
      ]);

      // Per-task dispatch — depends on which task findFirst is called for.
      mockDb.task.findFirst.mockImplementation((args: { where: { id: string } }) => {
        if (args.where.id === 'tsk_auto') {
          return Promise.resolve({
            id: 'tsk_auto',
            title: 'Automated',
            organization: { name: 'Acme Corp' },
          });
        }
        return Promise.resolve({
          id: 'tsk_att',
          title: 'Attached',
          organization: { name: 'Acme Corp' },
        });
      });
      mockDb.integrationCheckRun.findMany.mockImplementation(
        (args: { where: { taskId: string } }) =>
          args.where.taskId === 'tsk_auto'
            ? Promise.resolve([
                {
                  id: 'icr_1',
                  checkId: 'c',
                  checkName: 'Check',
                  status: 'success',
                  startedAt: new Date(),
                  completedAt: new Date(),
                  durationMs: 100,
                  totalChecked: 1,
                  passedCount: 1,
                  failedCount: 0,
                  errorMessage: null,
                  logs: null,
                  createdAt: new Date(),
                  connection: { provider: { slug: 'g', name: 'G' } },
                  results: [],
                },
              ])
            : Promise.resolve([]),
      );
      mockDb.evidenceAutomationRun.findMany.mockResolvedValue([]);

      // Per-task attachment fetches — only tsk_att has any
      mockDb.attachment.findMany.mockImplementation(
        (args: { where: { entityId?: string } }) =>
          args.where.entityId === 'tsk_att'
            ? Promise.resolve([
                {
                  id: 'att_1',
                  name: 'proof.pdf',
                  url: 'key',
                  type: 'document',
                  createdAt: new Date(),
                },
              ])
            : Promise.resolve([]),
      );

      (s3Client!.send as jest.Mock).mockResolvedValue({
        Body: Buffer.from('PDF'),
      });

      const { archive } =
        await service.streamOrganizationEvidenceZip('org_1');
      const mock = archive as unknown as MockArchive;
      await mock.finalized;

      const paths = mock.appendCalls.map((c) => c.options.name);
      expect(paths.some((p) => p.includes('/automated-'))).toBe(true);
      expect(paths.some((p) => p.includes('/attached-'))).toBe(true);
      expect(
        paths.some((p) => p.includes('/01-attachments/proof.pdf')),
      ).toBe(true);

      const manifestCall = mock.appendCalls.find((c) =>
        c.options.name.endsWith('/manifest.json'),
      );
      const manifestJson = JSON.parse(String(manifestCall!.source));
      expect(manifestJson.totalAttachments).toBe(1);
      expect(manifestJson.tasksCount).toBe(2);
    });
  });
});
