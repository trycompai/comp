import { Test } from '@nestjs/testing';
import type { AttachmentsService } from '@/attachments/attachments.service';
import type { AuthContext } from '@/auth/types';
import type { TimelinesService } from '../timelines/timelines.service';
import type { EvidenceFormsNotifierService } from './evidence-forms-notifier.service';
import { EvidenceFormsService } from './evidence-forms.service';
import { getCsvFieldValue } from './evidence-forms-csv';

jest.mock('@/attachments/attachments.service', () => ({
  AttachmentsService: class AttachmentsService {},
}));
jest.mock('../timelines/timelines.service', () => ({
  TimelinesService: class TimelinesService {},
}));
jest.mock('./evidence-forms-notifier.service', () => ({
  EvidenceFormsNotifierService: class EvidenceFormsNotifierService {},
}));
jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn(),
}));

const mockFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    evidenceSubmission: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe('EvidenceFormsService CSV attachment isolation', () => {
  const signDownloadUrl = jest.fn();
  const authContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: ['admin'],
    userId: 'usr_reviewer',
  };
  let service: EvidenceFormsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EvidenceFormsService,
          useFactory: (dependencies: {
            attachments: AttachmentsService;
            timelines: TimelinesService;
            notifier: EvidenceFormsNotifierService;
          }) =>
            new EvidenceFormsService(
              dependencies.attachments,
              dependencies.timelines,
              dependencies.notifier,
            ),
          inject: ['CSV_TEST_DEPENDENCIES'],
        },
        {
          provide: 'CSV_TEST_DEPENDENCIES',
          useValue: {
            attachments: { getPresignedDownloadUrl: signDownloadUrl },
            timelines: {},
            notifier: {},
          },
        },
      ],
    }).compile();
    service = module.get(EvidenceFormsService);
    signDownloadUrl.mockResolvedValue('https://example.com/fresh-signed-url');
  });

  function mockSubmission(file: unknown) {
    mockFindMany.mockResolvedValue([
      {
        id: 'sub_123',
        formType: 'penetration_test',
        submittedAt: new Date('2026-01-01'),
        submittedBy: { name: 'Reviewer', email: 'reviewer@example.com' },
        data: {
          submissionDate: '2026-01-01',
          testDate: '2026-01-01',
          vendorName: 'Security Vendor',
          summary: 'Historical submission',
          pentestReport: file,
        },
      },
    ]);
  }

  const exportCsv = () =>
    service.exportCsv({
      organizationId: 'org_123',
      formType: 'penetration-test',
      authContext,
    });

  it.each([
    'org_999/attachments/evidence-forms/penetration-test/private.pdf',
    'org_123evil/attachments/evidence-forms/penetration-test/private.pdf',
  ])('does not sign a historical foreign attachment: %s', async (fileKey) => {
    mockSubmission({
      fileName: 'private.pdf',
      fileKey,
      downloadUrl: 'https://example.com/stored-foreign-url',
    });

    const csv = await exportCsv();

    expect(signDownloadUrl).not.toHaveBeenCalled();
    expect(csv).not.toContain(fileKey);
    expect(csv).not.toContain('stored-foreign-url');
    expect(csv).toContain('Historical submission');
  });

  it('signs an attachment in the exporting organization', async () => {
    const fileKey =
      'org_123/attachments/evidence-forms/penetration-test/report.pdf';
    mockSubmission({ fileName: 'report.pdf', fileKey, downloadUrl: 'stale' });

    const csv = await exportCsv();

    expect(signDownloadUrl).toHaveBeenCalledWith(fileKey);
    expect(csv).toContain('https://example.com/fresh-signed-url');
    expect(csv).not.toContain('stale');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_123', formType: 'penetration_test' },
      }),
    );
  });

  it('does not export a stored download URL without a verifiable file key', async () => {
    mockSubmission({
      fileName: 'private.pdf',
      downloadUrl: 'https://example.com/stored-foreign-url',
    });

    const csv = await exportCsv();

    expect(signDownloadUrl).not.toHaveBeenCalled();
    expect(csv).not.toContain('stored-foreign-url');
  });

  it.each(['', '   '])(
    'does not export a legacy stored URL with a blank key: %j',
    async (fileKey) => {
      mockSubmission({
        fileName: 'private.pdf',
        fileKey,
        downloadUrl: 'https://example.com/stored-foreign-url',
      });

      const csv = await exportCsv();

      expect(signDownloadUrl).not.toHaveBeenCalled();
      expect(csv).not.toContain('stored-foreign-url');
    },
  );

  it.each(['', '   '])(
    'rejects blank file keys in the formatter even without URL refresh: %j',
    (fileKey) => {
      expect(
        getCsvFieldValue({
          field: {
            key: 'pentestReport',
            label: 'Report',
            type: 'file',
            required: true,
          },
          value: {
            fileKey,
            downloadUrl: 'https://example.com/stored-foreign-url',
          },
        }),
      ).toBe('');
    },
  );

  it('allows a read-only auditor to export an organization attachment', async () => {
    const fileKey =
      'org_123/attachments/evidence-forms/penetration-test/report.pdf';
    mockSubmission({ fileName: 'report.pdf', fileKey, downloadUrl: 'stale' });

    const csv = await service.exportCsv({
      organizationId: 'org_123',
      formType: 'penetration-test',
      authContext: { ...authContext, userRoles: ['auditor'] },
    });

    expect(signDownloadUrl).toHaveBeenCalledWith(fileKey);
    expect(csv).toContain('https://example.com/fresh-signed-url');
  });

  it('rejects an employee before loading or signing submissions', async () => {
    await expect(
      service.exportCsv({
        organizationId: 'org_123',
        formType: 'penetration-test',
        authContext: { ...authContext, userRoles: ['employee'] },
      }),
    ).rejects.toThrow('Access denied');

    expect(mockFindMany).not.toHaveBeenCalled();
    expect(signDownloadUrl).not.toHaveBeenCalled();
  });

  it('preserves CSV quoting and matrix columns without an optional attachment', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'sub,quoted',
        submittedAt: new Date('2026-01-01'),
        submittedBy: null,
        data: {
          matrixRows: [
            { system: 'AWS "production"', roleName: 'reader' },
            null,
            42,
          ],
        },
      },
    ]);

    const csv = await service.exportCsv({
      organizationId: 'org_123',
      formType: 'rbac-matrix',
      authContext,
    });

    expect(csv).toContain('"sub,quoted","2026-01-01T00:00:00.000Z"');
    expect(csv).toContain('System: AWS ""production"" | Role Name: reader');
    expect(csv).toContain(
      'Permissions / Scope:  | Approved By:  | Last Reviewed: ',
    );
    expect(signDownloadUrl).not.toHaveBeenCalled();
  });
});
