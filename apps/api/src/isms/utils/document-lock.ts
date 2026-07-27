import type { Prisma } from '@db';

/**
 * Serialize concurrent writes for a single ISMS document. The Postgres
 * transaction-scoped advisory lock (keyed on the document id) is held until the
 * surrounding transaction commits, so two transactions touching the same document
 * run one at a time. Used by register-row creates (so concurrent creates can't
 * read the same max(position)) and by approve (so concurrent approvals can't both
 * freeze a published version). Call this first, inside the transaction.
 */
export async function lockDocument(
  tx: Prisma.TransactionClient,
  documentId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${documentId}, 0))`;
}
