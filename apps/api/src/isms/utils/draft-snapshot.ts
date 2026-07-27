import type { Prisma } from '@db';

/**
 * Persist the derived-data snapshot as the document's DRAFT drift baseline.
 *
 * CS-701: version rows are now published-only, immutable snapshots, so the live
 * drift baseline moved off the version row onto `IsmsDocument.draftSnapshot`.
 * Drift is detected by comparing this against the current derived data. Runs on
 * the transaction client so it stays atomic with the derivation that produced it.
 */
export async function updateDraftSnapshot({
  tx,
  documentId,
  snapshot,
}: {
  tx: Prisma.TransactionClient;
  documentId: string;
  snapshot: unknown;
}): Promise<void> {
  const draftSnapshot: Prisma.InputJsonValue = JSON.parse(
    JSON.stringify(snapshot),
  );

  await tx.ismsDocument.update({
    where: { id: documentId },
    data: { draftSnapshot },
  });
}
