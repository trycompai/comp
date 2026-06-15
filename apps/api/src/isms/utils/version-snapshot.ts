import type { Prisma } from '@db';

const EMPTY_NARRATIVE: Prisma.InputJsonValue = {};

/**
 * Persist the derived-data snapshot onto the document's latest version, creating
 * version 1 if none exists. The snapshot is the drift baseline. Serializing
 * through JSON keeps it a plain Prisma.InputJsonValue without unsafe casts. The
 * existing narrative is preserved (only sourceSnapshot is written).
 */
export async function upsertLatestSnapshotVersion({
  tx,
  documentId,
  snapshot,
}: {
  tx: Prisma.TransactionClient;
  documentId: string;
  snapshot: unknown;
}): Promise<void> {
  const sourceSnapshot: Prisma.InputJsonValue = JSON.parse(
    JSON.stringify(snapshot),
  );

  const latest = await tx.ismsDocumentVersion.findFirst({
    where: { documentId, isLatest: true },
  });

  if (latest) {
    await tx.ismsDocumentVersion.update({
      where: { id: latest.id },
      data: { sourceSnapshot },
    });
    return;
  }

  await tx.ismsDocumentVersion.create({
    data: {
      documentId,
      version: 1,
      isLatest: true,
      narrative: EMPTY_NARRATIVE,
      sourceSnapshot,
    },
  });
}
