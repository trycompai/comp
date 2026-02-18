import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { NovuService } from '../notifications/novu.service';
import { FindingNotifierService } from './finding-notifier.service';

jest.mock(
  '@db',
  () => ({
    FindingType: {
      soc2: 'soc2',
      iso27001: 'iso27001',
    },
    FindingStatus: {
      open: 'open',
      ready_for_review: 'ready_for_review',
      needs_revision: 'needs_revision',
      closed: 'closed',
    },
    db: {
      organization: {
        findUnique: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
      member: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      evidenceSubmission: {
        findUnique: jest.fn(),
      },
    },
  }),
  { virtual: true },
);

jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: jest.fn(),
}));

jest.mock('../email/resend', () => ({
  sendEmail: jest.fn(),
}));

jest.mock(
  '../email/templates/finding-notification',
  () => ({
    FindingNotificationEmail: jest.fn(),
  }),
  { virtual: true },
);

const mockDbModule: {
  db: {
    organization: {
      findUnique: jest.Mock;
    };
    task: {
      findUnique: jest.Mock;
    };
    member: {
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    evidenceSubmission: {
      findUnique: jest.Mock;
    };
  };
  FindingType: {
    soc2: 'soc2';
    iso27001: 'iso27001';
  };
} = jest.requireMock('@db');
const { db, FindingType } = mockDbModule;

describe('FindingNotifierService', () => {
  const mockedDb = db;
  const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const mockedIsUserUnsubscribed = isUserUnsubscribed as jest.MockedFunction<
    typeof isUserUnsubscribed
  >;
  const novuTriggerMock = jest.fn();
  const novuServiceMock = {
    trigger: novuTriggerMock,
  } as unknown as NovuService;
  const service = new FindingNotifierService(novuServiceMock);

  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NEXT_PUBLIC_APP_URL = 'https://app.trycomp.ai';

    mockedDb.organization.findUnique.mockResolvedValue({
      name: 'Acme',
    });
    mockedDb.task.findUnique.mockResolvedValue({
      assignee: null,
    });
    mockedDb.member.findMany.mockResolvedValue([
      {
        role: 'admin',
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin User',
        },
      },
    ]);
    mockedDb.user.findUnique.mockResolvedValue({
      id: 'usr_submitter',
      email: 'submitter@example.com',
      name: 'Submitter User',
    });

    mockedIsUserUnsubscribed.mockResolvedValue(false);
    mockedSendEmail.mockResolvedValue({ id: 'email_123', message: 'queued' });
    novuTriggerMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  describe('notifyFindingCreated', () => {
    it('builds task URLs for task-targeted findings', async () => {
      await service.notifyFindingCreated({
        organizationId: 'org_123',
        findingId: 'fdg_123',
        taskId: 'tsk_123',
        taskTitle: 'Review vendor controls',
        findingContent: 'Task finding',
        findingType: FindingType.soc2,
        actorUserId: 'usr_actor',
        actorName: 'Actor',
      });

      expect(novuTriggerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            findingUrl: 'https://app.trycomp.ai/org_123/tasks/tsk_123',
          }),
        }),
      );
    });

    it('builds submission URLs for submission-targeted findings', async () => {
      await service.notifyFindingCreated({
        organizationId: 'org_123',
        findingId: 'fdg_234',
        evidenceSubmissionId: 'sub_123',
        evidenceSubmissionFormType: 'meeting',
        evidenceSubmissionSubmittedById: 'usr_submitter',
        findingContent: 'Submission finding',
        findingType: FindingType.soc2,
        actorUserId: 'usr_actor',
        actorName: 'Actor',
      });

      expect(novuTriggerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            findingUrl:
              'https://app.trycomp.ai/org_123/documents/meeting/submissions/sub_123',
          }),
        }),
      );
    });

    it('builds document URLs for evidenceFormType-only findings', async () => {
      await service.notifyFindingCreated({
        organizationId: 'org_123',
        findingId: 'fdg_345',
        evidenceSubmissionFormType: 'meeting',
        findingContent: 'Form type finding',
        findingType: FindingType.soc2,
        actorUserId: 'usr_actor',
        actorName: 'Actor',
      });

      expect(novuTriggerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            findingUrl: 'https://app.trycomp.ai/org_123/documents/meeting',
          }),
        }),
      );
    });
  });
});
