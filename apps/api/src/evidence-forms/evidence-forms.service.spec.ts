import type { AuthContext } from '@/auth/types';
import { EvidenceFormsService } from './evidence-forms.service';
import type { AttachmentsService } from '@/attachments/attachments.service';
import { db } from '@db';

jest.mock(
  '@/attachments/attachments.service',
  () => ({
    AttachmentsService: class AttachmentsService {},
  }),
  { virtual: true },
);

jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../timelines/timelines.service', () => ({
  TimelinesService: class TimelinesService {},
}));

jest.mock('@db', () => {
  const evidenceFormTypeEnum = {
    board_meeting: 'board_meeting',
    it_leadership_meeting: 'it_leadership_meeting',
    risk_committee_meeting: 'risk_committee_meeting',
    meeting: 'meeting',
    access_request: 'access_request',
    whistleblower_report: 'whistleblower_report',
    penetration_test: 'penetration_test',
    rbac_matrix: 'rbac_matrix',
    infrastructure_inventory: 'infrastructure_inventory',
    employee_performance_evaluation: 'employee_performance_evaluation',
    network_diagram: 'network_diagram',
    tabletop_exercise: 'tabletop_exercise',
  };

  return {
    EvidenceFormType: evidenceFormTypeEnum,
    db: {
      evidenceSubmission: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      evidenceFormSetting: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    },
  };
});

type MockDb = {
  evidenceSubmission: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  evidenceFormSetting: {
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
};

describe('EvidenceFormsService', () => {
  const authContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userRoles: ['admin'],
    userId: 'usr_reviewer',
    userEmail: 'reviewer@example.com',
  };

  const getPresignedDownloadUrlMock = jest.fn();
  const attachmentsServiceMock = {
    uploadToS3: jest.fn(),
    getPresignedDownloadUrl: getPresignedDownloadUrlMock,
  } as unknown as AttachmentsService;

  const timelinesServiceMock =
    {} as unknown as import('../timelines/timelines.service').TimelinesService;

  const evidenceFormsNotifierMock = {
    notifyAccessRequestSubmitted: jest.fn().mockResolvedValue(undefined),
  };

  const service = new EvidenceFormsService(
    attachmentsServiceMock,
    timelinesServiceMock,
    evidenceFormsNotifierMock as unknown as import('./evidence-forms-notifier.service').EvidenceFormsNotifierService,
  );
  const mockedDb = db as unknown as MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormStatuses', () => {
    it('includes relevance settings alongside latest submission dates', async () => {
      mockedDb.evidenceSubmission.groupBy.mockResolvedValue([
        {
          formType: 'meeting',
          _max: { submittedAt: new Date('2026-01-01T00:00:00.000Z') },
        },
      ]);
      mockedDb.evidenceFormSetting.findMany.mockResolvedValue([
        { formType: 'meeting', isNotRelevant: true },
      ]);

      const result = await service.getFormStatuses('org_123');

      expect(mockedDb.evidenceFormSetting.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_123' },
        select: { formType: true, isNotRelevant: true },
      });
      expect(result.meeting).toEqual({
        lastSubmittedAt: '2026-01-01T00:00:00.000Z',
        isNotRelevant: true,
      });
      expect(result['access-request']).toEqual({
        lastSubmittedAt: null,
        isNotRelevant: false,
      });
    });
  });

  describe('getFormSettings', () => {
    it('returns one setting entry for every document form', async () => {
      mockedDb.evidenceFormSetting.findMany.mockResolvedValue([
        {
          formType: 'access_request',
          isNotRelevant: true,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]);

      const result = await service.getFormSettings('org_123');

      expect(result).toContainEqual({
        formType: 'access-request',
        isNotRelevant: true,
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
      expect(result).toContainEqual({
        formType: 'meeting',
        isNotRelevant: false,
        updatedAt: null,
      });
    });
  });

  describe('updateFormSetting', () => {
    it('upserts a document relevance setting', async () => {
      mockedDb.evidenceFormSetting.upsert.mockResolvedValue({
        formType: 'meeting',
        isNotRelevant: true,
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      });

      const result = await service.updateFormSetting({
        organizationId: 'org_123',
        formType: 'meeting',
        payload: { isNotRelevant: true },
      });

      expect(mockedDb.evidenceFormSetting.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_formType: {
            organizationId: 'org_123',
            formType: 'meeting',
          },
        },
        create: {
          organizationId: 'org_123',
          formType: 'meeting',
          isNotRelevant: true,
        },
        update: { isNotRelevant: true },
        select: {
          formType: true,
          isNotRelevant: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual({
        formType: 'meeting',
        isNotRelevant: true,
        updatedAt: '2026-01-03T00:00:00.000Z',
      });
    });
  });

  describe('submitForm', () => {
    const accessRequestPayload = {
      submissionDate: '2026-01-01T00:00:00.000Z',
      userName: 'Jane Employee',
      accountsNeeded: 'GitHub (org: engineering)',
      permissionsNeeded: 'write',
      reasonForRequest: 'Needs write access for a new project',
      accessGrantedBy: 'IT Admin',
      dateAccessGranted: '2026-01-01',
    };

    it('notifies owners/admins after an access-request submission', async () => {
      mockedDb.evidenceSubmission.create.mockResolvedValue({
        id: 'sub_access_1',
        formType: 'access_request',
        data: accessRequestPayload,
        submittedBy: {
          id: 'usr_reviewer',
          name: 'Jane Employee',
          email: 'reviewer@example.com',
        },
      });

      await service.submitForm({
        organizationId: 'org_123',
        formType: 'access-request',
        payload: accessRequestPayload,
        authContext,
      });

      expect(
        evidenceFormsNotifierMock.notifyAccessRequestSubmitted,
      ).toHaveBeenCalledWith({
        organizationId: 'org_123',
        submitterUserId: 'usr_reviewer',
        submitterName: 'Jane Employee',
        submissionId: 'sub_access_1',
        data: accessRequestPayload,
      });
    });

    it('does not notify owners/admins for non access-request submissions', async () => {
      const meetingPayload = {
        submissionDate: '2026-01-01T00:00:00.000Z',
        attendees: 'Board members',
        date: '2026-01-01',
        meetingMinutes: 'Discussed Q1 roadmap',
        meetingMinutesApprovedBy: 'CEO',
        approvedDate: '2026-01-02',
      };

      mockedDb.evidenceSubmission.create.mockResolvedValue({
        id: 'sub_meeting_1',
        formType: 'meeting',
        data: meetingPayload,
        submittedBy: {
          id: 'usr_reviewer',
          name: 'Jane Employee',
          email: 'reviewer@example.com',
        },
      });

      await service.submitForm({
        organizationId: 'org_123',
        formType: 'meeting',
        payload: meetingPayload,
        authContext,
      });

      expect(
        evidenceFormsNotifierMock.notifyAccessRequestSubmitted,
      ).not.toHaveBeenCalled();
    });
  });

  describe('file field organization guard', () => {
    const pentestPayload = (fileKey: string) => ({
      submissionDate: '2026-01-01T00:00:00.000Z',
      testDate: '2026-01-01',
      vendorName: 'Acme Security',
      summary: 'No critical findings',
      pentestReport: {
        fileName: 'report.pdf',
        fileKey,
        downloadUrl: 'https://example.com/stale-signed-url',
      },
    });

    describe('submitForm', () => {
      it("rejects a fileKey belonging to another organization's attachments", async () => {
        await expect(
          service.submitForm({
            organizationId: 'org_123',
            formType: 'penetration-test',
            payload: pentestPayload(
              'org_999/attachments/evidence-forms/penetration-test/evil.pdf',
            ),
            authContext,
          }),
        ).rejects.toThrow(
          'Submitted file does not belong to this organization',
        );

        expect(mockedDb.evidenceSubmission.create).not.toHaveBeenCalled();
      });

      it("accepts a fileKey belonging to the caller's own organization", async () => {
        const fileKey =
          'org_123/attachments/evidence-forms/penetration-test/report.pdf';

        mockedDb.evidenceSubmission.create.mockResolvedValue({
          id: 'sub_pentest_1',
          formType: 'penetration_test',
          data: pentestPayload(fileKey),
          submittedBy: {
            id: 'usr_reviewer',
            name: 'Jane Employee',
            email: 'reviewer@example.com',
          },
        });

        await expect(
          service.submitForm({
            organizationId: 'org_123',
            formType: 'penetration-test',
            payload: pentestPayload(fileKey),
            authContext,
          }),
        ).resolves.toMatchObject({ id: 'sub_pentest_1' });
      });
    });

    describe('getSubmission (refreshFileUrls)', () => {
      it('does not presign a stored fileKey outside the organization and clears its download URL', async () => {
        mockedDb.evidenceSubmission.findFirst.mockResolvedValue({
          id: 'sub_pentest_2',
          formType: 'penetration_test',
          data: pentestPayload(
            'org_999/attachments/evidence-forms/penetration-test/evil.pdf',
          ),
          submittedBy: null,
          reviewedBy: null,
        });

        const result = await service.getSubmission({
          organizationId: 'org_123',
          authContext,
          formType: 'penetration-test',
          submissionId: 'sub_pentest_2',
        });

        expect(getPresignedDownloadUrlMock).not.toHaveBeenCalled();
        expect(result.submission.data).toMatchObject({
          pentestReport: { downloadUrl: null },
        });
      });

      it("presigns a stored fileKey that belongs to the caller's organization", async () => {
        getPresignedDownloadUrlMock.mockResolvedValue(
          'https://example.com/fresh-signed-url',
        );
        const fileKey =
          'org_123/attachments/evidence-forms/penetration-test/report.pdf';

        mockedDb.evidenceSubmission.findFirst.mockResolvedValue({
          id: 'sub_pentest_3',
          formType: 'penetration_test',
          data: pentestPayload(fileKey),
          submittedBy: null,
          reviewedBy: null,
        });

        const result = await service.getSubmission({
          organizationId: 'org_123',
          authContext,
          formType: 'penetration-test',
          submissionId: 'sub_pentest_3',
        });

        expect(getPresignedDownloadUrlMock).toHaveBeenCalledWith(fileKey);
        expect(result.submission.data).toMatchObject({
          pentestReport: {
            downloadUrl: 'https://example.com/fresh-signed-url',
          },
        });
      });
    });

    describe('exportCsv', () => {
      const exportSubmission = (fileKey: string) => ({
        id: 'sub_export_1',
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        submittedBy: { name: 'Jane Employee', email: 'jane@example.com' },
        data: pentestPayload(fileKey),
      });

      it('does not presign a stored fileKey outside the organization', async () => {
        mockedDb.evidenceSubmission.findMany.mockResolvedValue([
          exportSubmission(
            'org_999/attachments/evidence-forms/penetration-test/evil.pdf',
          ),
        ]);

        const csv = await service.exportCsv({
          organizationId: 'org_123',
          formType: 'penetration-test',
          authContext,
        });

        expect(getPresignedDownloadUrlMock).not.toHaveBeenCalled();
        expect(csv).not.toContain('org_999');
        expect(csv).toContain('sub_export_1');
      });

      it("presigns a stored fileKey that belongs to the caller's organization", async () => {
        getPresignedDownloadUrlMock.mockResolvedValue(
          'https://example.com/fresh-signed-url',
        );
        const fileKey =
          'org_123/attachments/evidence-forms/penetration-test/report.pdf';
        mockedDb.evidenceSubmission.findMany.mockResolvedValue([
          exportSubmission(fileKey),
        ]);

        const csv = await service.exportCsv({
          organizationId: 'org_123',
          formType: 'penetration-test',
          authContext,
        });

        expect(getPresignedDownloadUrlMock).toHaveBeenCalledWith(fileKey);
        expect(csv).toContain('https://example.com/fresh-signed-url');
      });
    });
  });

  describe('reviewSubmission', () => {
    it('includes submittedBy and reviewedBy relations on review update', async () => {
      mockedDb.evidenceSubmission.findFirst.mockResolvedValue({
        id: 'sub_123',
        status: 'pending',
      });
      mockedDb.evidenceSubmission.update.mockResolvedValue({
        id: 'sub_123',
        formType: 'meeting',
        submittedBy: {
          id: 'usr_submitter',
          name: 'Submitter',
          email: 'submitter@example.com',
        },
        reviewedBy: {
          id: 'usr_reviewer',
          name: 'Reviewer',
          email: 'reviewer@example.com',
        },
      });

      const result = await service.reviewSubmission({
        organizationId: 'org_123',
        formType: 'meeting',
        submissionId: 'sub_123',
        payload: {
          action: 'approved',
        },
        authContext,
      });

      expect(mockedDb.evidenceSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_123' },
          include: {
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      );
      expect(result).toMatchObject({
        submittedBy: {
          id: 'usr_submitter',
          name: 'Submitter',
          email: 'submitter@example.com',
        },
        reviewedBy: {
          id: 'usr_reviewer',
          name: 'Reviewer',
          email: 'reviewer@example.com',
        },
        formType: 'meeting',
      });
    });
  });
});
