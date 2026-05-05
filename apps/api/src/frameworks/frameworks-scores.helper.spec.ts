jest.mock('@db', () => ({
  BackgroundCheckStatus: {
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
  },
  db: {
    policy: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
    onboarding: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    frameworkInstance: { findFirst: jest.fn(), findMany: jest.fn() },
    employeeTrainingVideoCompletion: { findMany: jest.fn() },
    device: { findMany: jest.fn() },
    fleetPolicyResult: { findMany: jest.fn() },
    backgroundCheckRequest: { findMany: jest.fn() },
    evidenceSubmission: { groupBy: jest.fn() },
    evidenceFormSetting: { findMany: jest.fn() },
    finding: { findMany: jest.fn() },
    sOADocument: { findFirst: jest.fn() },
  },
}));

jest.mock('../utils/compliance-filters', () => ({
  filterComplianceMembers: jest.fn(),
}));

import { db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';
import {
  computeFrameworkComplianceScore,
  getOverviewScores,
} from './frameworks-scores.helper';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const mockDb = db as jest.Mocked<typeof db>;
const mockFilterComplianceMembers =
  filterComplianceMembers as jest.MockedFunction<
    typeof filterComplianceMembers
  >;

describe('frameworks-scores.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (mockDb.policy.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.task.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.onboarding.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.frameworkInstance.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([]);
    (
      mockDb.employeeTrainingVideoCompletion.findMany as jest.Mock
    ).mockResolvedValue([]);
    (mockDb.fleetPolicyResult.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
      { memberId: 'mem_2' },
    ]);
    (mockDb.evidenceSubmission.groupBy as jest.Mock).mockResolvedValue([]);
    (mockDb.evidenceFormSetting.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.finding.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.frameworkInstance.findMany as jest.Mock).mockResolvedValue([]);
    ((mockDb as any).sOADocument.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
  });

  it('excludes not relevant documents from overview document totals', async () => {
    (mockDb.member.findMany as jest.Mock).mockResolvedValue([]);
    mockFilterComplianceMembers.mockResolvedValue([]);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: false,
    });
    (mockDb.evidenceFormSetting.findMany as jest.Mock).mockResolvedValue([
      { formType: 'penetration_test', isNotRelevant: true },
    ]);

    const scores = await getOverviewScores('org_1');

    expect(scores.documents).toEqual({
      totalDocuments: 6,
      completedDocuments: 0,
      outstandingDocuments: 6,
    });
  });

  it('requires installed device for people completion when device agent step is enabled', async () => {
    const members: Array<{
      id: string;
      role: string;
      deactivated: boolean;
      user: { id: string; email: string; role: string };
    }> = [
      {
        id: 'mem_1',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
      },
      {
        id: 'mem_2',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
      },
    ];

    (mockDb.member.findMany as jest.Mock)
      .mockResolvedValueOnce(members)
      .mockResolvedValueOnce([]);
    mockFilterComplianceMembers.mockResolvedValue(members);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: true,
    });
    (mockDb.device.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
    ]);

    const scores = await getOverviewScores('org_1');

    expect(scores.people.total).toBe(2);
    expect(scores.people.completed).toBe(1);
    const deviceFindManyCalls = (mockDb.device.findMany as jest.Mock).mock
      .calls;
    expect(deviceFindManyCalls).toContainEqual([
      {
        where: {
          organizationId: 'org_1',
          memberId: { in: ['mem_1', 'mem_2'] },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      },
    ]);
  });

  it('skips installed device requirement when device agent step is disabled', async () => {
    const members: Array<{
      id: string;
      role: string;
      deactivated: boolean;
      user: { id: string; email: string; role: string };
    }> = [
      {
        id: 'mem_1',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
      },
      {
        id: 'mem_2',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
      },
    ];

    (mockDb.member.findMany as jest.Mock).mockResolvedValue(members);
    mockFilterComplianceMembers.mockResolvedValue(members);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
    });

    const scores = await getOverviewScores('org_1');

    expect(scores.people.total).toBe(2);
    expect(scores.people.completed).toBe(2);
    const deviceFindManyCalls = (mockDb.device.findMany as jest.Mock).mock
      .calls;
    expect(deviceFindManyCalls).toHaveLength(0);
  });

  it('counts Fleet-managed devices when device agent step is enabled', async () => {
    const members: Array<{
      id: string;
      userId: string;
      role: string;
      deactivated: boolean;
      user: { id: string; email: string; role: string };
    }> = [
      {
        id: 'mem_1',
        userId: 'usr_1',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
      },
      {
        id: 'mem_2',
        userId: 'usr_2',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
      },
    ];

    (mockDb.member.findMany as jest.Mock)
      .mockResolvedValueOnce(members)
      .mockResolvedValueOnce([{ id: 'mem_2', userId: 'usr_2' }]);
    mockFilterComplianceMembers.mockResolvedValue(members);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: true,
    });
    (mockDb.device.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.fleetPolicyResult.findMany as jest.Mock).mockResolvedValue([
      { userId: 'usr_2' },
    ]);

    const scores = await getOverviewScores('org_1');

    expect(scores.people.total).toBe(2);
    expect(scores.people.completed).toBe(1);
    const fleetPolicyCalls = (mockDb.fleetPolicyResult.findMany as jest.Mock)
      .mock.calls;
    expect(fleetPolicyCalls).toContainEqual([
      {
        where: {
          organizationId: 'org_1',
          userId: { in: ['usr_1', 'usr_2'] },
        },
        select: { userId: true },
        distinct: ['userId'],
      },
    ]);
  });

  it('requires all security training videos when security training step is enabled', async () => {
    const members: Array<{
      id: string;
      role: string;
      deactivated: boolean;
      user: { id: string; email: string; role: string };
    }> = [
      {
        id: 'mem_1',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
      },
      {
        id: 'mem_2',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
      },
    ];

    (mockDb.member.findMany as jest.Mock).mockResolvedValue(members);
    mockFilterComplianceMembers.mockResolvedValue(members);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: true,
      deviceAgentStepEnabled: false,
    });
    (
      mockDb.employeeTrainingVideoCompletion.findMany as jest.Mock
    ).mockResolvedValue([
      { memberId: 'mem_1', videoId: 'sat-1', completedAt: new Date() },
      { memberId: 'mem_1', videoId: 'sat-2', completedAt: new Date() },
      { memberId: 'mem_1', videoId: 'sat-3', completedAt: new Date() },
      { memberId: 'mem_1', videoId: 'sat-4', completedAt: new Date() },
      { memberId: 'mem_1', videoId: 'sat-5', completedAt: new Date() },
      { memberId: 'mem_2', videoId: 'sat-1', completedAt: new Date() },
      { memberId: 'mem_2', videoId: 'sat-2', completedAt: new Date() },
      { memberId: 'mem_2', videoId: 'sat-3', completedAt: new Date() },
      { memberId: 'mem_2', videoId: 'sat-4', completedAt: new Date() },
      { memberId: 'mem_2', videoId: 'sat-5', completedAt: null },
    ]);

    const scores = await getOverviewScores('org_1');

    expect(scores.people.total).toBe(2);
    expect(scores.people.completed).toBe(1);
    expect(
      mockDb.employeeTrainingVideoCompletion.findMany,
    ).toHaveBeenCalledWith({
      where: { memberId: { in: ['mem_1', 'mem_2'] } },
    });
  });

  describe('computeFrameworkComplianceScore', () => {
    it('returns 0 when the framework has no artifacts', () => {
      expect(computeFrameworkComplianceScore({ controls: [] }, [], [])).toBe(0);
    });

    it('returns 100 when every artifact across the framework is complete', () => {
      const framework = {
        controls: [
          {
            id: 'c1',
            policies: [{ id: 'p1', status: 'published' }],
            controlDocumentTypes: [],
          },
        ],
      };
      const tasks = [{ id: 't1', status: 'done', controls: [{ id: 'c1' }] }];
      expect(computeFrameworkComplianceScore(framework, tasks, [])).toBe(100);
    });

    it('weights every artifact equally instead of treating partial controls as 0%', () => {
      const framework = {
        controls: [
          {
            id: 'c1',
            policies: [{ id: 'p1', status: 'published' }],
            controlDocumentTypes: [{ formType: 'access_control_policy' }],
          },
          {
            id: 'c2',
            policies: [{ id: 'p2', status: 'draft' }],
            controlDocumentTypes: [],
          },
        ],
      };
      const tasks = [
        { id: 't1', status: 'done', controls: [{ id: 'c1' }] },
        { id: 't2', status: 'todo', controls: [{ id: 'c2' }] },
      ];
      // 5 unique artifacts (2 policies, 2 tasks, 1 doc type), 2 completed → 40%
      // The old binary-completion implementation would have returned 0%
      // because no control is fully satisfied.
      expect(computeFrameworkComplianceScore(framework, tasks, [])).toBe(40);
    });

    it('only treats a document as completed when its latest submission is within 6 months', () => {
      const framework = {
        controls: [
          {
            id: 'c1',
            policies: [],
            controlDocumentTypes: [
              { formType: 'access_control_policy' },
              { formType: 'incident_response_plan' },
            ],
          },
        ],
      };
      const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const stale = new Date(Date.now() - SIX_MONTHS_MS - 24 * 60 * 60 * 1000);
      const submissions = [
        { formType: 'access_control_policy', submittedAt: recent },
        { formType: 'incident_response_plan', submittedAt: stale },
      ];
      expect(computeFrameworkComplianceScore(framework, [], submissions)).toBe(
        50,
      );
    });

    it('excludes not relevant document requirements from framework scores', () => {
      const framework = {
        controls: [
          {
            id: 'c1',
            policies: [{ id: 'p1', status: 'published' }],
            controlDocumentTypes: [
              { formType: 'penetration_test', isNotRelevant: true },
            ],
          },
        ],
      };

      expect(computeFrameworkComplianceScore(framework, [], [])).toBe(100);
    });

    it('deduplicates artifacts shared across controls', () => {
      const framework = {
        controls: [
          {
            id: 'c1',
            policies: [{ id: 'p1', status: 'published' }],
            controlDocumentTypes: [{ formType: 'access_control_policy' }],
          },
          {
            id: 'c2',
            policies: [{ id: 'p1', status: 'published' }],
            controlDocumentTypes: [{ formType: 'access_control_policy' }],
          },
        ],
      };
      const sharedTask = {
        id: 't1',
        status: 'done',
        controls: [{ id: 'c1' }, { id: 'c2' }],
      };
      // Without dedup: 6 artifacts (2 policies, 2 tasks, 2 docs), 4 completed → 67%
      // With dedup: 2 unique artifacts (1 policy, 1 task), 2 completed; 1 unmet doc → 67%
      // Wait: 1 policy (done) + 1 task (done) + 1 doc (no submission, not fresh) = 2/3 = 67%
      expect(computeFrameworkComplianceScore(framework, [sharedTask], [])).toBe(
        67,
      );
    });
  });

  it('skips security training requirement when security training step is disabled', async () => {
    const members: Array<{
      id: string;
      role: string;
      deactivated: boolean;
      user: { id: string; email: string; role: string };
    }> = [
      {
        id: 'mem_1',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
      },
      {
        id: 'mem_2',
        role: 'owner',
        deactivated: false,
        user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
      },
    ];

    (mockDb.member.findMany as jest.Mock).mockResolvedValue(members);
    mockFilterComplianceMembers.mockResolvedValue(members);
    (mockDb.organization.findUnique as jest.Mock).mockResolvedValue({
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
    });

    const scores = await getOverviewScores('org_1');

    expect(scores.people.total).toBe(2);
    expect(scores.people.completed).toBe(2);
    expect(
      mockDb.employeeTrainingVideoCompletion.findMany,
    ).not.toHaveBeenCalled();
  });
});
