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
    (mockDb.member.findMany as jest.Mock).mockImplementation(
      async (args: { where?: { backgroundCheckExempt?: boolean } }) => {
        if (args?.where?.backgroundCheckExempt === true) return [];
        return [];
      },
    );
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

  it('counts all employees when BG checks are enabled and all have completed checks', async () => {
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
      { memberId: 'mem_2' },
    ]);

    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: true,
      hasHipaaFramework: false,
    });

    expect(score).toEqual({ total: 2, completed: 2 });
  });

  it('treats employees as complete without a BG check when backgroundCheckStepEnabled is false', async () => {
    // BG-check mock value is irrelevant — the bypass path never calls findMany.
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

  it('treats an exempt member as complete without a BG check (org-level on)', async () => {
    // mem_1 has no completed BG check; mem_2 has none either. Mark mem_1 exempt.
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.member.findMany as jest.Mock).mockImplementation(
      async (args: { where?: { backgroundCheckExempt?: boolean } }) => {
        if (args?.where?.backgroundCheckExempt === true) {
          return [{ id: 'mem_1' }];
        }
        return [];
      },
    );

    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: true,
      hasHipaaFramework: false,
    });

    // mem_1 exempt → counts complete; mem_2 not exempt + no BG check → not complete
    expect(score).toEqual({ total: 2, completed: 1 });
  });

  it('counts a mix of completed BG checks and exempt members correctly', async () => {
    // mem_1 has a completed BG check; mem_2 is exempt
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([
      { memberId: 'mem_1' },
    ]);
    (mockDb.member.findMany as jest.Mock).mockImplementation(
      async (args: { where?: { backgroundCheckExempt?: boolean } }) => {
        if (args?.where?.backgroundCheckExempt === true) {
          return [{ id: 'mem_2' }];
        }
        return [];
      },
    );

    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: true,
      hasHipaaFramework: false,
    });

    expect(score).toEqual({ total: 2, completed: 2 });
  });

  it('counts every member as complete when all members are exempt', async () => {
    (mockDb.backgroundCheckRequest.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.member.findMany as jest.Mock).mockImplementation(async (args: {
      where?: { backgroundCheckExempt?: boolean };
    }) => {
      if (args?.where?.backgroundCheckExempt === true) {
        return [{ id: 'mem_1' }, { id: 'mem_2' }];
      }
      return [];
    });

    const score = await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: true,
      hasHipaaFramework: false,
    });

    expect(score).toEqual({ total: 2, completed: 2 });
  });

  it('skips the exempt query entirely when backgroundCheckStepEnabled is false', async () => {
    (mockDb.member.findMany as jest.Mock).mockClear();

    await computePeopleScore({
      organizationId: 'org_1',
      allPolicies: [],
      employees: members,
      securityTrainingStepEnabled: false,
      deviceAgentStepEnabled: false,
      backgroundCheckStepEnabled: false,
      hasHipaaFramework: false,
    });

    // The exempt query targets backgroundCheckExempt: true. Confirm it was not called with that arg.
    const findManyCalls = (mockDb.member.findMany as jest.Mock).mock.calls;
    const exemptQueryCalled = findManyCalls.some(
      ([args]: [{ where?: { backgroundCheckExempt?: boolean } }]) =>
        args?.where?.backgroundCheckExempt === true,
    );
    expect(exemptQueryCalled).toBe(false);
  });
});
