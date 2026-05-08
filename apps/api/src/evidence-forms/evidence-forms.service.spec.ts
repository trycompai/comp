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
  checkAutoCompletePhases: jest.fn(),
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
        groupBy: jest.fn(),
        update: jest.fn(),
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
    groupBy: jest.Mock;
    update: jest.Mock;
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

  const attachmentsServiceMock = {
    uploadToS3: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
  } as unknown as AttachmentsService;

  const timelinesServiceMock =
    {} as unknown as import('../timelines/timelines.service').TimelinesService;

  const service = new EvidenceFormsService(
    attachmentsServiceMock,
    timelinesServiceMock,
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
