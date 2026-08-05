// Prisma.sql/Prisma.raw are pure template-string builders — safe to use the
// real ones from @prisma/client without a DB connection. Mocked here only so
// importing '@db' (which re-exports the whole @prisma/client package plus
// the lazily-connecting `db` proxy) doesn't risk touching anything else.
jest.mock('@db', () => {
  const { Prisma } = require('@prisma/client');
  return { Prisma };
});

import {
  assertNoDanglingMemberReferences,
  findMemberForeignKeys,
  quoteIdentifier,
  repointGenericForeignKeys,
} from './merge-duplicate-user-fk-discovery';

function createFakeTx() {
  return {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
}

describe('quoteIdentifier', () => {
  it('quotes a safe identifier', () => {
    expect(quoteIdentifier('Task')).toBe('"Task"');
    expect(quoteIdentifier('background_check_requests')).toBe(
      '"background_check_requests"',
    );
  });

  it('rejects identifiers with characters outside [A-Za-z0-9_]', () => {
    expect(() => quoteIdentifier('Task"; DROP TABLE "Task')).toThrow(
      /Refusing to use unexpected SQL identifier/,
    );
    expect(() => quoteIdentifier('some table')).toThrow();
    expect(() => quoteIdentifier('')).toThrow();
  });
});

describe('findMemberForeignKeys', () => {
  it('maps information_schema rows to tableName/columnName pairs', async () => {
    const tx = createFakeTx();
    tx.$queryRaw.mockResolvedValue([
      { table_name: 'Task', column_name: 'assigneeId' },
      { table_name: 'background_check_requests', column_name: 'memberId' },
    ]);

    const result = await findMemberForeignKeys(tx as never);

    expect(result).toEqual([
      { tableName: 'Task', columnName: 'assigneeId' },
      { tableName: 'background_check_requests', columnName: 'memberId' },
    ]);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when no foreign keys are found', async () => {
    const tx = createFakeTx();
    tx.$queryRaw.mockResolvedValue([]);

    expect(await findMemberForeignKeys(tx as never)).toEqual([]);
  });
});

describe('repointGenericForeignKeys', () => {
  it('runs an UPDATE for each foreign key not in skipTables', async () => {
    const tx = createFakeTx();
    tx.$executeRaw.mockResolvedValue(1);
    const foreignKeys = [
      { tableName: 'Task', columnName: 'assigneeId' },
      { tableName: 'Risk', columnName: 'assigneeId' },
    ];

    const repointed = await repointGenericForeignKeys(
      tx as never,
      foreignKeys,
      new Set(),
      'mem_old',
      'mem_new',
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(repointed).toEqual(foreignKeys);
  });

  it('skips tables in skipTables entirely', async () => {
    const tx = createFakeTx();
    tx.$executeRaw.mockResolvedValue(1);
    const foreignKeys = [
      { tableName: 'Task', columnName: 'assigneeId' },
      { tableName: 'background_check_requests', columnName: 'memberId' },
    ];

    const repointed = await repointGenericForeignKeys(
      tx as never,
      foreignKeys,
      new Set(['background_check_requests']),
      'mem_old',
      'mem_new',
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(repointed).toEqual([
      { tableName: 'Task', columnName: 'assigneeId' },
    ]);
  });

  it('returns an empty list and issues no updates when given no foreign keys', async () => {
    const tx = createFakeTx();

    const repointed = await repointGenericForeignKeys(
      tx as never,
      [],
      new Set(),
      'mem_old',
      'mem_new',
    );

    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(repointed).toEqual([]);
  });
});

describe('assertNoDanglingMemberReferences', () => {
  it('resolves without throwing when nothing still references the old member', async () => {
    const tx = createFakeTx();
    tx.$queryRaw.mockResolvedValue([{ exists: false }]);

    await expect(
      assertNoDanglingMemberReferences(
        tx as never,
        [{ tableName: 'Task', columnName: 'assigneeId' }],
        'mem_old',
        {
          'Extra.check': () => Promise.resolve(0),
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('throws naming the table.column still pointing at the old member', async () => {
    const tx = createFakeTx();
    tx.$queryRaw.mockResolvedValue([{ exists: true }]);

    await expect(
      assertNoDanglingMemberReferences(
        tx as never,
        [{ tableName: 'Task', columnName: 'assigneeId' }],
        'mem_old',
        {},
      ),
    ).rejects.toThrow('Task.assigneeId');
  });

  it('throws naming an extra (non-FK) check that still has dangling rows', async () => {
    const tx = createFakeTx();
    tx.$queryRaw.mockResolvedValue([{ exists: false }]);

    await expect(
      assertNoDanglingMemberReferences(tx as never, [], 'mem_old', {
        'Policy.signedBy': () => Promise.resolve(2),
      }),
    ).rejects.toThrow('Policy.signedBy');
  });

  it('aggregates every dangling reference into a single error', async () => {
    const tx = createFakeTx();
    // Two foreign keys checked in order — both dangling.
    tx.$queryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }]);

    await expect(
      assertNoDanglingMemberReferences(
        tx as never,
        [
          { tableName: 'Task', columnName: 'assigneeId' },
          { tableName: 'Risk', columnName: 'assigneeId' },
        ],
        'mem_old',
        { 'Policy.signedBy': () => Promise.resolve(1) },
      ),
    ).rejects.toThrow('Task.assigneeId, Risk.assigneeId, Policy.signedBy');
  });
});
