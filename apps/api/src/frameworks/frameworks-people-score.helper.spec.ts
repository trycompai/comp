jest.mock('@db', () => ({
  BackgroundCheckStatus: {
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
  },
  db: {
    employeeTrainingVideoCompletion: { findMany: jest.fn() },
    device: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
    fleetPolicyResult: { findMany: jest.fn() },
    backgroundCheckRequest: { findMany: jest.fn() },
  },
}));

jest.mock('../utils/compliance-filters', () => ({
  filterComplianceMembers: jest.fn(),
}));

import { db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';
import { computePeopleScore } from './frameworks-people-score.helper';

const mockDb = db as jest.Mocked<typeof db>;
const mockFilterComplianceMembers =
  filterComplianceMembers as jest.MockedFunction<
    typeof filterComplianceMembers
  >;

const members: Array<{
  id: string;
  role: string;
  user: { id: string; email: string; role: string };
}> = [
  {
    id: 'mem_1',
    role: 'owner',
    user: { id: 'usr_1', email: 'a@example.com', role: 'owner' },
  },
  {
    id: 'mem_2',
    role: 'owner',
    user: { id: 'usr_2', email: 'b@example.com', role: 'owner' },
  },
];

describe('computePeopleScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterComplianceMembers.mockResolvedValue(members);
    (
      mockDb.employeeTrainingVideoCompletion.findMany as jest.Mock
    ).mockResolvedValue([]);
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
    ]);
  });

  it('requires a completed or uploaded background check for people completion', async () => {
    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: true,
      hasHipaaFramework: false,
    });

    expect(score).toEqual({ total: 2, completed: 1 });
    expect(mockDb.backgroundCheckRequest.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org_1',
        memberId: { in: ['mem_1', 'mem_2'] },
        status: { in: ['completed', 'completed_with_flags'] },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    });
  });

  it('treats employees as complete without a BG check when backgroundCheckStepEnabled is false', async () => {
    // Only mem_1 has a completed BG check; mem_2 has none
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
    ]);

    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: false,
      hasHipaaFramework: false,
    });

    expect(score).toEqual({ total: 2, completed: 2 });
  });

  it('skips the BG-check query entirely when backgroundCheckStepEnabled is false', async () => {
    await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: false,
      hasHipaaFramework: false,
    });

    expect(mockDb.backgroundCheckRequest.findMany).not.toHaveBeenCalled();
  });
});
