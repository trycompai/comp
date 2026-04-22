jest.mock('@db', () => ({
  db: {
    policy: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
    onboarding: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    frameworkInstance: { findFirst: jest.fn() },
    employeeTrainingVideoCompletion: { findMany: jest.fn() },
    device: { findMany: jest.fn() },
    fleetPolicyResult: { findMany: jest.fn() },
    evidenceSubmission: { groupBy: jest.fn() },
    finding: { findMany: jest.fn() },
  },
}));

jest.mock('../utils/compliance-filters', () => ({
  filterComplianceMembers: jest.fn(),
}));

import { db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';
import { getOverviewScores } from './frameworks-scores.helper';

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
    (
      mockDb.employeeTrainingVideoCompletion.findMany as jest.Mock
    ).mockResolvedValue([]);
    (mockDb.fleetPolicyResult.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.evidenceSubmission.groupBy as jest.Mock).mockResolvedValue([]);
    (mockDb.finding.findMany as jest.Mock).mockResolvedValue([]);
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
    expect(mockDb.employeeTrainingVideoCompletion.findMany).not.toHaveBeenCalled();
  });
});
