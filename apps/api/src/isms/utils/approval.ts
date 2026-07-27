import type { Prisma } from '@db';
import { lockDocument } from './document-lock';

/**
 * Editing an approved ISMS document invalidates its sign-off: revert it to draft
 * so the change must be re-approved (mirrors policy approval invalidation). Only
 * touches the document when it is currently `approved`; a no-op otherwise. Must
 * run inside the same transaction as the content write so a failed write does not
 * leave the document reverted to draft without the new content.
 *
 * Every content-mutation path (register create/update/delete, narrative save,
 * control link add/remove, regenerate) calls this, so acquiring the per-document
 * advisory lock here centrally serializes ALL edits against approve() — which
 * takes the same lock. Without it, an edit could interleave while approve() is
 * loading + freezing the version under READ COMMITTED, leaving an approved version
 * that omits the edit (or an edit that never invalidated the approval). The lock
 * is transaction-scoped and re-entrant, so create paths that already take it for
 * position allocation are unaffected.
 */
export async function invalidateApprovalIfNeeded({
  tx,
  documentId,
}: {
  tx: Prisma.TransactionClient;
  documentId: string;
}): Promise<void> {
  await lockDocument(tx, documentId);

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
