// The catalog-driven discovery mechanism itself is tested in isolation in
// merge-duplicate-user-fk-discovery.spec.ts. Mocked here so this file only
// covers repointMemberRelations's own concerns: wiring discovery + generic
// repoint + the hand-written exceptions (unique-constraint dedupe,
// Policy.signedBy, IsmsObjective.ownerMemberId) + the final safety check.
const mockFindMemberForeignKeys = jest.fn();
const mockRepointGenericForeignKeys = jest.fn();
const mockAssertNoDanglingMemberReferences = jest.fn();
jest.mock('./merge-duplicate-user-fk-discovery', () => ({
  findMemberForeignKeys: (...args: unknown[]) =>
    mockFindMemberForeignKeys(...args),
  repointGenericForeignKeys: (...args: unknown[]) =>
    mockRepointGenericForeignKeys(...args),
  assertNoDanglingMemberReferences: (...args: unknown[]) =>
    mockAssertNoDanglingMemberReferences(...args),
}));

jest.mock('@db', () => {
  const { createDbProxyMock } = require('./merge-duplicate-user-db-mock.util');
  return { db: createDbProxyMock(), Prisma: {} };
});

import { db } from '@db';
import { repointMemberRelations } from './merge-duplicate-user-member-relations';

const ORG_ID = 'org_1';
const O = 'mem_old';
const N = 'mem_new';

describe('repointMemberRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMemberForeignKeys.mockResolvedValue([
      { tableName: 'Task', columnName: 'assigneeId' },
    ]);
    mockRepointGenericForeignKeys.mockResolvedValue([
      { tableName: 'Task', columnName: 'assigneeId' },
    ]);
    mockAssertNoDanglingMemberReferences.mockResolvedValue(undefined);
  });

  it('discovers, generically repoints, and returns stats', async () => {
    const stats = await repointMemberRelations(db, ORG_ID, O, N);

    expect(mockFindMemberForeignKeys).toHaveBeenCalledWith(db);
    expect(mockRepointGenericForeignKeys).toHaveBeenCalledWith(
      db,
      [{ tableName: 'Task', columnName: 'assigneeId' }],
      new Set([
        'background_check_requests',
        'OffboardingChecklistCompletion',
        'OffboardingAccessRevocation',
        'EmployeeTrainingVideoCompletion',
      ]),
      O,
      N,
    );
    expect(stats).toEqual({
      foreignKeysDiscovered: 1,
      genericRepointed: ['Task.assigneeId'],
      signedByPoliciesUpdated: 0,
    });
  });

  it('runs the safety check with the full discovered FK list plus the non-FK extras', async () => {
    await repointMemberRelations(db, ORG_ID, O, N);

    expect(mockAssertNoDanglingMemberReferences).toHaveBeenCalledWith(
      db,
      [{ tableName: 'Task', columnName: 'assigneeId' }],
      O,
      expect.objectContaining({
        'IsmsObjective.ownerMemberId': expect.any(Function),
        'Policy.signedBy': expect.any(Function),
      }),
    );
  });

  it('propagates the safety-check error instead of swallowing it', async () => {
    mockAssertNoDanglingMemberReferences.mockRejectedValue(
      new Error(
        'Merge safety check failed: member mem_old is still referenced by: Task.assigneeId',
      ),
    );

    await expect(
      repointMemberRelations(db as never, ORG_ID, O, N),
    ).rejects.toThrow('Merge safety check failed');
  });

  describe('BackgroundCheckRequest (unique on organizationId, memberId)', () => {
    it('drops the old row when the new member already has one', async () => {
      (db.backgroundCheckRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 'bg_new',
      });

      await repointMemberRelations(db, ORG_ID, O, N);

      expect(db.backgroundCheckRequest.deleteMany).toHaveBeenCalledWith({
        where: { memberId: O },
      });
      expect(db.backgroundCheckRequest.updateMany).not.toHaveBeenCalled();
    });

    it('migrates the old row when the new member has none', async () => {
      (db.backgroundCheckRequest.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await repointMemberRelations(db, ORG_ID, O, N);

      expect(db.backgroundCheckRequest.updateMany).toHaveBeenCalledWith({
        where: { memberId: O },
        data: { memberId: N },
      });
      expect(db.backgroundCheckRequest.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('migrates non-duplicate OffboardingChecklistCompletion rows and drops duplicates', async () => {
    (
      db.offboardingChecklistCompletion.findMany as jest.Mock
    ).mockImplementation(({ where }: { where: { memberId: string } }) =>
      where.memberId === O
        ? [
            { id: 'occ_1', templateItemId: 'tpl_1' },
            { id: 'occ_2', templateItemId: 'tpl_2' },
          ]
        : [{ templateItemId: 'tpl_2' }],
    );

    await repointMemberRelations(db, ORG_ID, O, N);

    expect(db.offboardingChecklistCompletion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['occ_1'] } },
      data: { memberId: N },
    });
    expect(db.offboardingChecklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['occ_2'] } },
    });
  });

  it('migrates non-duplicate OffboardingAccessRevocation rows and drops duplicates', async () => {
    (db.offboardingAccessRevocation.findMany as jest.Mock).mockImplementation(
      ({ where }: { where: { memberId: string } }) =>
        where.memberId === O
          ? [
              { id: 'oar_1', vendorId: 'vnd_1' },
              { id: 'oar_2', vendorId: 'vnd_2' },
            ]
          : [{ vendorId: 'vnd_2' }],
    );

    await repointMemberRelations(db, ORG_ID, O, N);

    expect(db.offboardingAccessRevocation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['oar_1'] } },
      data: { memberId: N },
    });
    expect(db.offboardingAccessRevocation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['oar_2'] } },
    });
  });

  it('migrates non-duplicate EmployeeTrainingVideoCompletion rows and leaves duplicates for cascade cleanup', async () => {
    (
      db.employeeTrainingVideoCompletion.findMany as jest.Mock
    ).mockImplementation(({ where }: { where: { memberId: string } }) =>
      where.memberId === O
        ? [
            { id: 'evc_1', videoId: 'vid_1' },
            { id: 'evc_2', videoId: 'vid_2' },
          ]
        : [{ videoId: 'vid_2' }],
    );

    await repointMemberRelations(db, ORG_ID, O, N);

    expect(db.employeeTrainingVideoCompletion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['evc_1'] } },
      data: { memberId: N },
    });
    // No delete branch exists for this model — the duplicate row is left on
    // the old member and is cleaned up by the member.delete cascade.
    expect(
      db.employeeTrainingVideoCompletion.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it('replaces the old member id inside Policy.signedBy arrays and reports the count', async () => {
    (db.policy.findMany as jest.Mock).mockResolvedValue([
      { id: 'pol_1', signedBy: [O, 'mem_other'] },
    ]);

    const stats = await repointMemberRelations(db, ORG_ID, O, N);

    expect(db.policy.update).toHaveBeenCalledWith({
      where: { id: 'pol_1' },
      data: { signedBy: [N, 'mem_other'] },
    });
    expect(stats.signedByPoliciesUpdated).toBe(1);
  });

  it('re-points IsmsObjective.ownerMemberId, which has no real foreign key', async () => {
    await repointMemberRelations(db, ORG_ID, O, N);

    expect(db.ismsObjective.updateMany).toHaveBeenCalledWith({
      where: { ownerMemberId: O },
      data: { ownerMemberId: N },
    });
  });
});
