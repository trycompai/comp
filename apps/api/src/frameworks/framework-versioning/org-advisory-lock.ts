import type { Prisma } from '@db';

const LOCK_NAMESPACE = 0x46575653; // 'FVSS' — framework-versioning sync/service

export async function lockOrganizationForSync(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock($1, hashtext($2))`,
    LOCK_NAMESPACE,
    organizationId,
  );
}
