import { Prisma } from '@db';

/**
 * Reads foreign keys pointing at Member.id directly from Postgres's own
 * catalog, instead of a hand-maintained list — so a relation added later is
 * picked up automatically the next time the merge runs, rather than being
 * silently missed (which is what happened previously: a relation was added
 * while this merge task's PR was still open, the hand-written list never
 * learned about it, and that relation's row for the old member was lost
 * instead of re-pointed).
 */

export interface MemberForeignKey {
  tableName: string;
  columnName: string;
}

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function quoteIdentifier(identifier: string): string {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new Error(
      `Refusing to use unexpected SQL identifier from information_schema: ${identifier}`,
    );
  }
  return `"${identifier}"`;
}

/** Every foreign key in the current schema that references Member.id. */
export async function findMemberForeignKeys(
  tx: Prisma.TransactionClient,
): Promise<MemberForeignKey[]> {
  const rows = await tx.$queryRaw<
    Array<{ table_name: string; column_name: string }>
  >`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = current_schema()
      AND ccu.table_name = 'Member'
      AND ccu.column_name = 'id'
  `;
  return rows.map((row) => ({
    tableName: row.table_name,
    columnName: row.column_name,
  }));
}

/**
 * Re-points every discovered foreign key from `oldMemberId` to
 * `newMemberId`, except `skipTables` — tables whose member-id column shares
 * a unique constraint with another field, where a blind `UPDATE` could
 * violate that constraint. Returns the ones actually updated, for logging.
 */
export async function repointGenericForeignKeys(
  tx: Prisma.TransactionClient,
  foreignKeys: MemberForeignKey[],
  skipTables: ReadonlySet<string>,
  oldMemberId: string,
  newMemberId: string,
): Promise<MemberForeignKey[]> {
  const repointed: MemberForeignKey[] = [];
  for (const fk of foreignKeys) {
    if (skipTables.has(fk.tableName)) continue;
    const table = quoteIdentifier(fk.tableName);
    const column = quoteIdentifier(fk.columnName);
    await tx.$executeRaw(
      Prisma.sql`UPDATE ${Prisma.raw(table)} SET ${Prisma.raw(column)} = ${newMemberId} WHERE ${Prisma.raw(column)} = ${oldMemberId}`,
    );
    repointed.push(fk);
  }
  return repointed;
}

/**
 * Throws if any discovered foreign key still has a row pointing at
 * `oldMemberId` — a safety net so an unhandled or buggy relation fails
 * loudly instead of silently losing data when the old member row is deleted
 * afterward (some relations cascade-delete or null out on that delete).
 * `extraChecks` covers member-id columns with no real foreign key (so
 * catalog introspection can never find them) — each returns the count of
 * rows still referencing `oldMemberId`.
 */
export async function assertNoDanglingMemberReferences(
  tx: Prisma.TransactionClient,
  foreignKeys: MemberForeignKey[],
  oldMemberId: string,
  extraChecks: Record<string, () => Promise<number>>,
): Promise<void> {
  const dangling: string[] = [];

  for (const fk of foreignKeys) {
    const table = quoteIdentifier(fk.tableName);
    const column = quoteIdentifier(fk.columnName);
    const rows = await tx.$queryRaw<Array<{ exists: boolean }>>(
      Prisma.sql`SELECT EXISTS(SELECT 1 FROM ${Prisma.raw(table)} WHERE ${Prisma.raw(column)} = ${oldMemberId}) AS exists`,
    );
    if (rows[0]?.exists) {
      dangling.push(`${fk.tableName}.${fk.columnName}`);
    }
  }

  for (const [label, check] of Object.entries(extraChecks)) {
    if ((await check()) > 0) dangling.push(label);
  }

  if (dangling.length > 0) {
    throw new Error(
      `Merge safety check failed: member ${oldMemberId} is still referenced by: ${dangling.join(', ')}`,
    );
  }
}
