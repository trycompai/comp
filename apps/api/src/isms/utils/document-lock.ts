import type { Prisma } from '@db';

/**
 * Serialize register-row position allocation for a single document. The Postgres
 * transaction-scoped advisory lock (keyed on the document id) is held until the
 * surrounding transaction commits, so two concurrent creates can't both read the
 * same max(position) and persist duplicate ordering keys. Call this inside the
 * create transaction, before computing the next position.
 */
export async function lockDocumentForPositions(
  tx: Prisma.TransactionClient,
  documentId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${documentId}, 0))`;
}
