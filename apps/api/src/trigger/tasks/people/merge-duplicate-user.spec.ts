import { db } from '@db';
import { mergeDuplicateUser } from './merge-duplicate-user';

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schemaTask: (config: unknown) => config,
  tags: { add: jest.fn() },
}));

// Auto-mocking `db`/`tx`: the task touches ~30 models. Rather than hand-list
// every one, `createDbProxyMock` (in merge-duplicate-user-db-mock.util.ts)
// lazily builds a { updateMany, deleteMany, delete, findMany, findUnique,
// count } mock per model name on first access, resolving to harmless
// defaults unless a test overrides them. `$transaction` invokes its
// callback with the same proxy as `tx`, so assertions against
// `db.<model>.<method>` see calls made via `tx` too. Pulled in via
// `require` (not a top-level import) because jest.mock factories can't
// close over module-scope bindings.
jest.mock('@db', () => {
  const { createDbProxyMock } = require('./merge-duplicate-user-db-mock.util');
  return { db: createDbProxyMock() };
});

// schemaTask's declared return type doesn't expose `run` as callable, but our
// mock above makes `schemaTask` return the config object verbatim — this
// narrows just enough to invoke it without an `any` escape hatch.
interface MergeDuplicateUserRunnable {
  run: (params: {
    organizationId: string;
    oldEmail: string;
    newEmail: string;
  }) => Promise<{
    success: boolean;
    survivingUserId: string;
    survivingMemberId: string;
    userLevelRelationsMerged: boolean;
    mergedUserId: string;
    mergedMemberId: string;
  }>;
}

interface MergeDuplicateUserSchema {
  schema: { safeParse: (input: unknown) => { success: boolean } };
}

const runMerge = (params: {
  organizationId: string;
  oldEmail: string;
  newEmail: string;
}) => (mergeDuplicateUser as unknown as MergeDuplicateUserRunnable).run(params);

const parseInput = (input: unknown) =>
  (mergeDuplicateUser as unknown as MergeDuplicateUserSchema).schema.safeParse(
    input,
  );

const ORG_ID = 'org_1';
const OLD_EMAIL = 'old@example.com';
const NEW_EMAIL = 'new@example.com';

const oldUser = { id: 'usr_old', email: OLD_EMAIL };
const newUser = { id: 'usr_new', email: NEW_EMAIL };
const oldMember = { id: 'mem_old', userId: 'usr_old' };
const newMember = { id: 'mem_new', userId: 'usr_new' };

describe('mergeDuplicateUser', () => {
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

    // Default: the old user has no membership in any other org.
    (db.member.count as jest.Mock).mockResolvedValue(0);
  });

  describe('schema validation', () => {
    it('rejects when newEmail equals oldEmail', () => {
      const result = parseInput({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: OLD_EMAIL,
      });

      expect(result.success).toBe(false);
    });

    it('rejects when newEmail equals oldEmail case-insensitively', () => {
      const result = parseInput({
        organizationId: ORG_ID,
        oldEmail: 'User@Example.com',
        newEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
    });

    it('accepts when oldEmail and newEmail differ', () => {
      const result = parseInput({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: NEW_EMAIL,
      });

      expect(result.success).toBe(true);
    });
  });

  it('throws when the old user cannot be resolved by email', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL }),
    ).rejects.toThrow(`Old user not found: ${OLD_EMAIL}`);
  });

  it('throws when the old member cannot be resolved in this org', async () => {
    (db.member.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL }),
    ).rejects.toThrow(/Old member not found/);
  });

  it('throws when the new user cannot be resolved by email', async () => {
    (db.user.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { email: string } }) =>
        where.email === OLD_EMAIL ? oldUser : null,
    );

    await expect(
      runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL }),
    ).rejects.toThrow(`New user not found: ${NEW_EMAIL}`);
  });

  it('throws when the new member cannot be resolved in this org', async () => {
    (db.member.findFirst as jest.Mock).mockImplementation(
      ({ where }: { where: { userId: string } }) =>
        where.userId === oldUser.id ? oldMember : null,
    );

    await expect(
      runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL }),
    ).rejects.toThrow(/New member not found/);
  });

  describe('when the old user belongs to no other org', () => {
    it('re-points member-level relations and deletes the old member', async () => {
      const result = await runMerge({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: NEW_EMAIL,
      });

      expect(db.task.updateMany).toHaveBeenCalledWith({
        where: { assigneeId: 'mem_old' },
        data: { assigneeId: 'mem_new' },
      });
      expect(db.member.delete).toHaveBeenCalledWith({ where: { id: 'mem_old' } });
      expect(db.invitation.updateMany).toHaveBeenCalledWith({
        where: { email: OLD_EMAIL, organizationId: ORG_ID },
        data: { email: NEW_EMAIL },
      });
      expect(result.mergedMemberId).toBe('mem_old');
      expect(result.survivingMemberId).toBe('mem_new');
    });

    it('re-points user-level relations and clears the old user sessions', async () => {
      const result = await runMerge({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: NEW_EMAIL,
      });

      expect(db.account.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_old' },
        data: { userId: 'usr_new' },
      });
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'usr_old' },
      });
      expect(result.userLevelRelationsMerged).toBe(true);
      expect(result.mergedUserId).toBe('usr_old');
      expect(result.survivingUserId).toBe('usr_new');
    });

    it('keeps the old user record instead of deleting it', async () => {
      await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

      expect(db.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('when the old user is also a member of another org', () => {
    beforeEach(() => {
      (db.member.count as jest.Mock).mockResolvedValue(1);
    });

    it('skips the account move and session delete', async () => {
      const result = await runMerge({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: NEW_EMAIL,
      });

      expect(db.account.updateMany).not.toHaveBeenCalled();
      expect(db.session.deleteMany).not.toHaveBeenCalled();
      expect(db.user.delete).not.toHaveBeenCalled();
      expect(result.userLevelRelationsMerged).toBe(false);
    });

    it('still merges member-level relations and deletes the old member for this org', async () => {
      const result = await runMerge({
        organizationId: ORG_ID,
        oldEmail: OLD_EMAIL,
        newEmail: NEW_EMAIL,
      });

      expect(db.member.delete).toHaveBeenCalledWith({ where: { id: 'mem_old' } });
      expect(db.invitation.updateMany).toHaveBeenCalledWith({
        where: { email: OLD_EMAIL, organizationId: ORG_ID },
        data: { email: NEW_EMAIL },
      });
      expect(result.mergedMemberId).toBe('mem_old');
    });

    it('skips every other user-scoped relation, since the old user still belongs elsewhere', async () => {
      await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

      expect(db.fleetPolicyResult.updateMany).not.toHaveBeenCalled();
      expect(db.oauthAccessToken.updateMany).not.toHaveBeenCalled();
      expect(db.oauthConsent.updateMany).not.toHaveBeenCalled();
      expect(db.mcpOrgBinding.deleteMany).not.toHaveBeenCalled();
      expect(db.integrationSyncLog.updateMany).not.toHaveBeenCalled();
      expect(db.integrationOAuthError.updateMany).not.toHaveBeenCalled();
      expect(db.evidenceSubmission.updateMany).not.toHaveBeenCalled();
      expect(db.integrationResult.updateMany).not.toHaveBeenCalled();

      // AuditLog and OffboardingChecklistCompletion are also touched at the
      // member level (memberId), so assert the specific user-scoped calls
      // never happened rather than asserting the mock overall.
      expect(db.auditLog.updateMany).not.toHaveBeenCalledWith({
        where: { userId: 'usr_old' },
        data: { userId: 'usr_new' },
      });
      expect(db.finding.updateMany).not.toHaveBeenCalledWith({
        where: { createdByAdminId: 'usr_old' },
        data: { createdByAdminId: 'usr_new' },
      });
      expect(db.offboardingChecklistCompletion.updateMany).not.toHaveBeenCalledWith({
        where: { completedById: 'usr_old' },
        data: { completedById: 'usr_new' },
      });
      expect(db.offboardingAccessRevocation.updateMany).not.toHaveBeenCalledWith({
        where: { revokedById: 'usr_old' },
        data: { revokedById: 'usr_new' },
      });
    });
  });
});
