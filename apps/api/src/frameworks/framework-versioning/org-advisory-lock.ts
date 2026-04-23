import type { Prisma } from '@db';

const LOCK_NAMESPACE = 0x46575653; // 'FVSS' — framework-versioning sync/service

export async function lockOrganizationForSync(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  // Tagged-template form of $executeRaw — Prisma parameterizes the values,
  // keeping us off the `Unsafe` raw path even though the hashtext input is a
  // controlled, server-side string.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, hashtext(${organizationId}))`;
}
