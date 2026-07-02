import { db } from '@db';
import { mergeDuplicateUser } from './merge-duplicate-user';

// Companion to merge-duplicate-user.spec.ts: field-by-field coverage of every
// relation re-pointed by the merge, plus the dedup branches (unique
// constraints where a duplicate must be dropped instead of migrated). Split
// out to keep each spec file under the project's 300-line limit.

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schemaTask: (config: unknown) => config,
  tags: { add: jest.fn() },
}));

jest.mock('@db', () => {
  const { createDbProxyMock } = require('./merge-duplicate-user-db-mock.util');
  return { db: createDbProxyMock() };
});

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

describe('mergeDuplicateUser relation re-pointing', () => {
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

  it('re-points every other simple member-scoped relation', async () => {
    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    const o = 'mem_old';
    const n = 'mem_new';
    expect(db.policy.updateMany).toHaveBeenCalledWith({
      where: { approverId: o },
      data: { approverId: n },
    });
    expect(db.policyVersion.updateMany).toHaveBeenCalledWith({
      where: { publishedById: o },
      data: { publishedById: n },
    });
    expect(db.risk.updateMany).toHaveBeenCalledWith({
      where: { assigneeId: o },
      data: { assigneeId: n },
    });
    expect(db.vendor.updateMany).toHaveBeenCalledWith({
      where: { assigneeId: o },
      data: { assigneeId: n },
    });
    expect(db.finding.updateMany).toHaveBeenCalledWith({
      where: { memberId: o },
      data: { memberId: n },
    });
    expect(db.comment.updateMany).toHaveBeenCalledWith({
      where: { authorId: o },
      data: { authorId: n },
    });
    expect(db.device.updateMany).toHaveBeenCalledWith({
      where: { memberId: o },
      data: { memberId: n },
    });
    expect(db.trustAccessRequest.updateMany).toHaveBeenCalledWith({
      where: { reviewerMemberId: o },
      data: { reviewerMemberId: n },
    });
    expect(db.sOADocument.updateMany).toHaveBeenCalledWith({
      where: { approverId: o },
      data: { approverId: n },
    });
    expect(db.ismsDocument.updateMany).toHaveBeenCalledWith({
      where: { approverId: o },
      data: { approverId: n },
    });
  });

  it('replaces the old member id inside Policy.signedBy arrays', async () => {
    (db.policy.findMany as jest.Mock).mockResolvedValue([
      { id: 'pol_1', signedBy: ['mem_old', 'mem_other'] },
    ]);

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.policy.update).toHaveBeenCalledWith({
      where: { id: 'pol_1' },
      data: { signedBy: ['mem_new', 'mem_other'] },
    });
  });

  it('drops the old BackgroundCheckRequest when the new member already has one', async () => {
    (db.backgroundCheckRequest.findUnique as jest.Mock).mockResolvedValue({
      id: 'bg_new',
    });

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.backgroundCheckRequest.deleteMany).toHaveBeenCalledWith({
      where: { memberId: 'mem_old' },
    });
    expect(db.backgroundCheckRequest.updateMany).not.toHaveBeenCalled();
  });

  it('migrates the old BackgroundCheckRequest when the new member has none', async () => {
    (db.backgroundCheckRequest.findUnique as jest.Mock).mockResolvedValue(null);

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.backgroundCheckRequest.updateMany).toHaveBeenCalledWith({
      where: { memberId: 'mem_old' },
      data: { memberId: 'mem_new' },
    });
    expect(db.backgroundCheckRequest.deleteMany).not.toHaveBeenCalled();
  });

  it('migrates non-duplicate OffboardingChecklistCompletion rows and drops duplicates', async () => {
    (db.offboardingChecklistCompletion.findMany as jest.Mock).mockImplementation(
      ({ where }: { where: { memberId: string } }) =>
        where.memberId === 'mem_old'
          ? [
              { id: 'occ_1', templateItemId: 'tpl_1' },
              { id: 'occ_2', templateItemId: 'tpl_2' },
            ]
          : [{ templateItemId: 'tpl_2' }],
    );

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.offboardingChecklistCompletion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['occ_1'] } },
      data: { memberId: 'mem_new' },
    });
    expect(db.offboardingChecklistCompletion.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['occ_2'] } },
    });
  });

  it('migrates non-duplicate OffboardingAccessRevocation rows, drops duplicates, and re-points revokedById', async () => {
    (db.offboardingAccessRevocation.findMany as jest.Mock).mockImplementation(
      ({ where }: { where: { memberId: string } }) =>
        where.memberId === 'mem_old'
          ? [
              { id: 'oar_1', vendorId: 'vnd_1' },
              { id: 'oar_2', vendorId: 'vnd_2' },
            ]
          : [{ vendorId: 'vnd_2' }],
    );

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.offboardingAccessRevocation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['oar_1'] } },
      data: { memberId: 'mem_new' },
    });
    expect(db.offboardingAccessRevocation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['oar_2'] } },
    });
    expect(db.offboardingAccessRevocation.updateMany).toHaveBeenCalledWith({
      where: { revokedById: 'usr_old' },
      data: { revokedById: 'usr_new' },
    });
  });

  it('migrates non-duplicate EmployeeTrainingVideoCompletion rows and leaves duplicates for cascade cleanup', async () => {
    (db.employeeTrainingVideoCompletion.findMany as jest.Mock).mockImplementation(
      ({ where }: { where: { memberId: string } }) =>
        where.memberId === 'mem_old'
          ? [
              { id: 'evc_1', videoId: 'vid_1' },
              { id: 'evc_2', videoId: 'vid_2' },
            ]
          : [{ videoId: 'vid_2' }],
    );

    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.employeeTrainingVideoCompletion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['evc_1'] } },
      data: { memberId: 'mem_new' },
    });
    // No delete branch exists for this model — the duplicate row is left on
    // the old member and is cleaned up by the member.delete cascade.
    expect(db.employeeTrainingVideoCompletion.deleteMany).not.toHaveBeenCalled();
  });

  it('re-points every other simple user-scoped relation', async () => {
    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

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
  });

  it('deletes (not updates) the old McpOrgBinding, since userId is unique', async () => {
    await runMerge({ organizationId: ORG_ID, oldEmail: OLD_EMAIL, newEmail: NEW_EMAIL });

    expect(db.mcpOrgBinding.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr_old' },
    });
    expect(db.mcpOrgBinding.updateMany).not.toHaveBeenCalled();
  });
});
