import type { Prisma } from '@db';

/**
 * Editing an approved ISMS document invalidates its sign-off: revert it to draft
 * so the change must be re-approved (mirrors policy approval invalidation). Only
 * touches the document when it is currently `approved`; a no-op otherwise. Must
 * run inside the same transaction as the content write so a failed write does not
 * leave the document reverted to draft without the new content.
 */
export async function invalidateApprovalIfNeeded({
  tx,
  documentId,
}: {
  tx: Prisma.TransactionClient;
  documentId: string;
}): Promise<void> {
  const document = await tx.ismsDocument.findUnique({
    where: { id: documentId },
    select: { status: true },
  });

  if (document?.status !== 'approved') {
    return;
  }

  await tx.ismsDocument.update({
    where: { id: documentId },
    data: { status: 'draft', approvedAt: null, approverId: null },
  });
}
