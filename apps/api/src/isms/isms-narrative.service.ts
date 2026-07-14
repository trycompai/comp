import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { narrativeSchemaForType } from './documents/registry';
import { invalidateApprovalIfNeeded } from './utils/approval';

/**
 * Saves the singleton-document narrative (clauses 4.3 ISMS Scope and 5.1
 * Leadership Commitment) onto the document's working DRAFT (`draftNarrative`).
 * The payload is validated against the per-type Zod schema before persisting.
 * CS-701: the draft narrative lives on IsmsDocument, not the version row, so an
 * edit never touches a published version.
 */
@Injectable()
export class IsmsNarrativeService {
  async save({
    documentId,
    organizationId,
    narrative,
  }: {
    documentId: string;
    organizationId: string;
    narrative: unknown;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const schema = narrativeSchemaForType(document.type);
    if (!schema) {
      throw new BadRequestException(
        `Document type ${document.type} does not store a narrative`,
      );
    }

    const parsed = schema.safeParse(narrative);
    if (!parsed.success) {
      throw new BadRequestException(
        `Invalid narrative: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.')} ${issue.message}`)
          .join('; ')}`,
      );
    }

    const value: Prisma.InputJsonValue = JSON.parse(
      JSON.stringify(parsed.data),
    );

    // Approval invalidation and the narrative write must be atomic: a failed
    // write must not leave the document reverted to draft without the new
    // content. Reverting to draft leaves the published `currentVersion` intact —
    // v1 stays live while the draft is edited.
    return db.$transaction(async (tx) => {
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsDocument.update({
        where: { id: documentId },
        data: { draftNarrative: value },
        select: { id: true, draftNarrative: true },
      });
    });
  }
}
