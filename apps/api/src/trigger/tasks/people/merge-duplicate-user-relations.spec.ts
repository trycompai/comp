import { db } from '@db';
import { mergeDuplicateUser } from './merge-duplicate-user';

// Companion to merge-duplicate-user.spec.ts: field-by-field coverage of
// every USER-scoped relation re-pointed by the merge. Split out to keep each
// spec file under the project's 300-line limit.
//
// Member-scoped relations moved to their own dedicated specs when that
// side switched to catalog-driven FK discovery:
// - merge-duplicate-user-fk-discovery.spec.ts (the generic discovery/repoint/
//   dangling-check mechanism)
// - merge-duplicate-user-member-relations.spec.ts (orchestration + the
//   hand-written exceptions: unique-constraint dedupe, Policy.signedBy,
//   IsmsObjective.ownerMemberId)

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schemaTask: (config: unknown) => config,
  tags: { add: jest.fn() },
}));

jest.mock('@db', () => {
  const { createDbProxyMock } = require('./merge-duplicate-user-db-mock.util');
  return { db: createDbProxyMock() };
});

// See merge-duplicate-user.spec.ts for why this is mocked here too.
jest.mock('./merge-duplicate-user-member-relations', () => ({
  repointMemberRelations: jest.fn().mockResolvedValue({
    foreignKeysDiscovered: 0,
    genericRepointed: [],
    signedByPoliciesUpdated: 0,
  }),
}));

interface MergeDuplicateUserRunnable {
  run: (params: {
    organizationId: string;
    oldEmail: string;
    newEmail: string;
  }) => Promise<{ success: boolean }>;
}

const runMerge = (params: {
  organizationId: string;
  oldEmail: string;
  newEmail: string;
}) => (mergeDuplicateUser as unknown as MergeDuplicateUserRunnable).run(params);

const ORG_ID = 'org_1';
const OLD_EMAIL = 'old@example.com';
const NEW_EMAIL = 'new@example.com';

const oldUser = { id: 'usr_old', email: OLD_EMAIL };
const newUser = { id: 'usr_new', email: NEW_EMAIL };
const oldMember = { id: 'mem_old', userId: 'usr_old' };
const newMember = { id: 'mem_new', userId: 'usr_new' };

describe('mergeDuplicateUser user-relation re-pointing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (db.user.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { email: string } }) => {
        if (where.email === OLD_EMAIL) return oldUser;
        if (where.email === NEW_EMAIL) return newUser;
        return null;
      },
    );
    (db.member.findFirst as jest.Mock).mockImplementation(
      ({ where }: { where: { userId: string } }) => {
        if (where.userId === oldUser.id) return oldMember;
        if (where.userId === newUser.id) return newMember;
        return null;
      },
    );
    (db.member.count as jest.Mock).mockResolvedValue(0);
  });

  it('re-points every other simple user-scoped relation', async () => {
    await runMerge({
      organizationId: ORG_ID,
      oldEmail: OLD_EMAIL,
      newEmail: NEW_EMAIL,
    });

    const o = 'usr_old';
    const n = 'usr_new';
    expect(db.oauthAccessToken.updateMany).toHaveBeenCalledWith({
      where: { userId: o },
      data: { userId: n },
    });
    expect(db.oauthConsent.updateMany).toHaveBeenCalledWith({
      where: { userId: o },
      data: { userId: n },
    });
    expect(db.integrationSyncLog.updateMany).toHaveBeenCalledWith({
      where: { userId: o },
      data: { userId: n },
    });
    expect(db.integrationOAuthError.updateMany).toHaveBeenCalledWith({
      where: { userId: o },
      data: { userId: n },
    });
    expect(db.evidenceSubmission.updateMany).toHaveBeenCalledWith({
      where: { submittedById: o },
      data: { submittedById: n },
    });
    expect(db.evidenceSubmission.updateMany).toHaveBeenCalledWith({
      where: { reviewedById: o },
      data: { reviewedById: n },
    });
    expect(db.finding.updateMany).toHaveBeenCalledWith({
      where: { createdByAdminId: o },
      data: { createdByAdminId: n },
    });
    expect(db.offboardingChecklistCompletion.updateMany).toHaveBeenCalledWith({
      where: { completedById: o },
      data: { completedById: n },
    });
    expect(db.offboardingAccessRevocation.updateMany).toHaveBeenCalledWith({
      where: { revokedById: o },
      data: { revokedById: n },
    });
  });

  it('deletes (not updates) the old McpOrgBinding, since userId is unique', async () => {
    await runMerge({
      organizationId: ORG_ID,
      oldEmail: OLD_EMAIL,
      newEmail: NEW_EMAIL,
    });

    expect(db.mcpOrgBinding.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr_old' },
    });
    expect(db.mcpOrgBinding.updateMany).not.toHaveBeenCalled();
  });
});
