import { db } from '@db';
import { mergeDuplicateUser } from './merge-duplicate-user';
import { migrateOrgEmailDomain } from './migrate-org-email-domain';

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schemaTask: (config: unknown) => config,
  tags: { add: jest.fn() },
}));

jest.mock('@db', () => ({
  db: { member: { findMany: jest.fn() } },
}));

jest.mock('./merge-duplicate-user', () => ({
  mergeDuplicateUser: { triggerAndWait: jest.fn() },
}));

// schemaTask's declared return type doesn't expose `run` as callable, but our
// mock above makes `schemaTask` return the config object verbatim — this
// narrows just enough to invoke it without an `any` escape hatch.
interface MigrateOrgEmailDomainRunnable {
  run: (params: {
    organizationId: string;
    oldDomain: string;
    newDomain: string;
  }) => Promise<{
    mergedCount: number;
    failedCount?: number;
    pairs: Array<{ oldEmail: string; newEmail: string; ok: boolean; error?: string }>;
  }>;
}

const runMigration = (params: {
  organizationId: string;
  oldDomain: string;
  newDomain: string;
}) =>
  (migrateOrgEmailDomain as unknown as MigrateOrgEmailDomainRunnable).run(params);

const ORG_ID = 'org_1';

function member(email: string) {
  return { user: { email } };
}

describe('migrateOrgEmailDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mergeDuplicateUser.triggerAndWait as jest.Mock).mockResolvedValue({ ok: true });
  });

  it('returns immediately when old and new domains normalize to the same value', async () => {
    const result = await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'Example.com',
      newDomain: 'example.COM',
    });

    expect(result).toEqual({ mergedCount: 0, failedCount: 0, pairs: [] });
    expect(db.member.findMany).not.toHaveBeenCalled();
    expect(mergeDuplicateUser.triggerAndWait).not.toHaveBeenCalled();
  });

  it('queries only active, non-deactivated members of the org', async () => {
    (db.member.findMany as jest.Mock).mockResolvedValue([]);

    await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'old.com',
      newDomain: 'new.com',
    });

    expect(db.member.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, isActive: true, deactivated: false },
      select: { user: { select: { email: true } } },
    });
  });

  it('finds no pairs when no old-domain email has a matching new-domain counterpart', async () => {
    (db.member.findMany as jest.Mock).mockResolvedValue([
      member('carol@old.com'),
      member('dave@new.com'),
    ]);

    const result = await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'old.com',
      newDomain: 'new.com',
    });

    expect(result).toEqual({ mergedCount: 0, pairs: [] });
    expect(mergeDuplicateUser.triggerAndWait).not.toHaveBeenCalled();
  });

  it('matches old- and new-domain emails by local part, case-insensitively, preserving original casing', async () => {
    (db.member.findMany as jest.Mock).mockResolvedValue([
      member('Alice@OLD.COM'),
      member('alice@new.com'),
      member('carol@old.com'),
      member('dave@new.com'),
    ]);

    await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'old.com',
      newDomain: 'new.com',
    });

    expect(mergeDuplicateUser.triggerAndWait).toHaveBeenCalledTimes(1);
    expect(mergeDuplicateUser.triggerAndWait).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      oldEmail: 'Alice@OLD.COM',
      newEmail: 'alice@new.com',
    });
  });

  it('merges every matched pair and reports aggregate counts', async () => {
    (db.member.findMany as jest.Mock).mockResolvedValue([
      member('alice@old.com'),
      member('alice@new.com'),
      member('bob@old.com'),
      member('bob@new.com'),
    ]);
    (mergeDuplicateUser.triggerAndWait as jest.Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    const result = await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'old.com',
      newDomain: 'new.com',
    });

    expect(mergeDuplicateUser.triggerAndWait).toHaveBeenCalledTimes(2);
    expect(result.mergedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.pairs).toEqual([
      { oldEmail: 'alice@old.com', newEmail: 'alice@new.com', ok: true },
      { oldEmail: 'bob@old.com', newEmail: 'bob@new.com', ok: true },
    ]);
  });

  it('records a failed merge without aborting the remaining pairs', async () => {
    (db.member.findMany as jest.Mock).mockResolvedValue([
      member('alice@old.com'),
      member('alice@new.com'),
      member('bob@old.com'),
      member('bob@new.com'),
    ]);
    (mergeDuplicateUser.triggerAndWait as jest.Mock)
      .mockResolvedValueOnce({ ok: false, error: 'boom' })
      .mockResolvedValueOnce({ ok: true });

    const result = await runMigration({
      organizationId: ORG_ID,
      oldDomain: 'old.com',
      newDomain: 'new.com',
    });

    expect(mergeDuplicateUser.triggerAndWait).toHaveBeenCalledTimes(2);
    expect(result.mergedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.pairs).toEqual([
      { oldEmail: 'alice@old.com', newEmail: 'alice@new.com', ok: false, error: 'boom' },
      { oldEmail: 'bob@old.com', newEmail: 'bob@new.com', ok: true },
    ]);
  });
});
