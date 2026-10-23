import { SQL } from 'bun';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const ORG = 'org_member_fk_test';
const USER = 'usr_member_fk_test';
const MEMBER = 'mem_member_fk_test';
const AUDIT_LOG = 'aud_member_fk_test';
const FINDING = 'fnd_member_fk_test';
const VENDOR = 'vnd_member_fk_test';

interface Outcome {
  memberRows: number;
  auditLog: { memberId: string | null; userId: string | null } | undefined;
  finding: { memberId: string | null } | undefined;
  vendor: { assigneeId: string | null } | undefined;
}

class Rollback extends Error {
  constructor(readonly outcome: Outcome) {
    super('rollback');
  }
}

async function runScenario(sql: SQL): Promise<Outcome> {
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(
        `INSERT INTO "User" (id, name, email, "emailVerified", "updatedAt")
         VALUES ('${USER}', 'Departing Member', 'member-fk-test@example.com', true, NOW())`,
      );
      await tx.unsafe(`INSERT INTO "Organization" (id, name) VALUES ('${ORG}', 'FK Test Org')`);
      await tx.unsafe(
        `INSERT INTO "Member" (id, "organizationId", "userId", role)
         VALUES ('${MEMBER}', '${ORG}', '${USER}', 'employee')`,
      );
      await tx.unsafe(
        `INSERT INTO "AuditLog" (id, "organizationId", "userId", "memberId", data)
         VALUES ('${AUDIT_LOG}', '${ORG}', '${USER}', '${MEMBER}', '{}'::jsonb)`,
      );
      await tx.unsafe(
        `INSERT INTO "Finding" (id, "organizationId", "memberId", content, "updatedAt")
         VALUES ('${FINDING}', '${ORG}', '${MEMBER}', 'Missing security training', NOW())`,
      );
      await tx.unsafe(
        `INSERT INTO "Vendor" (id, "organizationId", "assigneeId", name, description, "updatedAt")
         VALUES ('${VENDOR}', '${ORG}', '${MEMBER}', 'Acme', 'Vendor', NOW())`,
      );

      await tx.unsafe(`DELETE FROM "Member" WHERE id = '${MEMBER}'`);

      const members: { count: number }[] = await tx.unsafe(
        `SELECT COUNT(*)::int AS count FROM "Member" WHERE id = '${MEMBER}'`,
      );
      const [auditLog] = await tx.unsafe(
        `SELECT "memberId", "userId" FROM "AuditLog" WHERE id = '${AUDIT_LOG}'`,
      );
      const [finding] = await tx.unsafe(`SELECT "memberId" FROM "Finding" WHERE id = '${FINDING}'`);
      const [vendor] = await tx.unsafe(`SELECT "assigneeId" FROM "Vendor" WHERE id = '${VENDOR}'`);

      throw new Rollback({ memberRows: members[0].count, auditLog, finding, vendor });
    });
  } catch (error) {
    if (error instanceof Rollback) return error.outcome;
    throw error;
  }
  throw new Error('scenario transaction was not rolled back');
}

describe('deleting a Member keeps its audit evidence (migrations)', () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL must point at a Postgres database');

  const sql = new SQL(databaseUrl);
  let outcome: Outcome;

  beforeAll(async () => {
    outcome = await runScenario(sql);
  });
  afterAll(async () => {
    await sql.close();
  });

  it('deletes the member row', () => {
    expect(outcome.memberRows).toBe(0);
  });

  it('keeps the audit log entry, still attributed to the acting user', () => {
    expect(outcome.auditLog).toEqual({ memberId: null, userId: USER });
  });

  it('keeps the finding raised against the member', () => {
    expect(outcome.finding).toEqual({ memberId: null });
  });

  it('keeps the assigned vendor, unassigned', () => {
    expect(outcome.vendor).toEqual({ assigneeId: null });
  });
});
