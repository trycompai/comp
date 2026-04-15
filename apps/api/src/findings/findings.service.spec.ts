import { FindingsService } from './findings.service';

jest.mock('@db', () => ({
  db: {
    finding: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
  EvidenceFormType: {},
  FindingStatus: {
    open: 'open',
    ready_for_review: 'ready_for_review',
    needs_revision: 'needs_revision',
    closed: 'closed',
  },
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
  },
}));

jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../timelines/timelines.service', () => ({
  TimelinesService: class TimelinesService {},
}));

import { db } from '@db';
import { checkAutoCompletePhases } from '../frameworks/frameworks-timeline.helper';

const mockDb = db as jest.Mocked<typeof db>;

describe('FindingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers timeline AUTO_FINDINGS check when a finding is closed', async () => {
    const findingAuditService = {
      logFindingStatusChanged: jest.fn().mockResolvedValue(undefined),
      logFindingTypeChanged: jest.fn().mockResolvedValue(undefined),
      logFindingContentUpdated: jest.fn().mockResolvedValue(undefined),
    };
    const findingNotifierService = {
      notifyReadyForReview: jest.fn(),
      notifyNeedsRevision: jest.fn(),
      notifyFindingClosed: jest.fn(),
    };
    const timelinesService = {};

    const service = new FindingsService(
      findingAuditService as any,
      findingNotifierService as any,
      timelinesService as any,
    );

    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 'fnd_1',
      status: 'open',
      type: 'soc2',
      content: 'Issue content',
      task: { id: 'tsk_1', title: 'Collect evidence' },
      evidenceSubmission: null,
      evidenceFormType: null,
      createdById: 'mem_1',
    } as any);

    (mockDb.finding.update as jest.Mock).mockResolvedValue({
      id: 'fnd_1',
      status: 'closed',
      type: 'soc2',
      content: 'Issue content',
      createdBy: null,
      template: null,
      task: { id: 'tsk_1', title: 'Collect evidence' },
    });
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
      name: 'Auditor',
      email: 'auditor@example.com',
    });

    await service.update(
      'org_1',
      'fnd_1',
      { status: 'closed' } as any,
      ['auditor'],
      false,
      'usr_1',
      'mem_1',
    );

    expect(checkAutoCompletePhases).toHaveBeenCalledWith({
      organizationId: 'org_1',
      timelinesService,
    });
  });
});
