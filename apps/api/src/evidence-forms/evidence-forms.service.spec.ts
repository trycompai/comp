import type { AuthContext } from '@/auth/types';
import { EvidenceFormsService } from './evidence-forms.service';
import type { AttachmentsService } from '@/attachments/attachments.service';
import { db } from '@trycompai/db';

jest.mock(
  '@/attachments/attachments.service',
  () => ({
    AttachmentsService: class AttachmentsService {},
  }),
  { virtual: true },
);

jest.mock('@trycompai/db', () => {
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
  };

  return {
    EvidenceFormType: evidenceFormTypeEnum,
    db: {
      evidenceSubmission: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    },
  };
});

type MockDb = {
  evidenceSubmission: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe('EvidenceFormsService', () => {
  const authContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'jwt',
    isApiKey: false,
    userRoles: ['admin'],
    userId: 'usr_reviewer',
    userEmail: 'reviewer@example.com',
  };

  const attachmentsServiceMock = {
    uploadToS3: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
  } as unknown as AttachmentsService;

  const service = new EvidenceFormsService(attachmentsServiceMock);
  const mockedDb = db as unknown as MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
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
