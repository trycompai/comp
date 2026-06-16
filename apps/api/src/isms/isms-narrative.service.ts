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
 * Leadership Commitment) into the document's latest version. The payload is
 * validated against the per-type Zod schema before persisting.
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

    // The latest-version read, approval invalidation, and the narrative write
    // must all be atomic: reading the latest version outside the transaction
    // lets a concurrent save update a stale version or hit the unique
    // constraint, and a failed write must not leave the document reverted to
    // draft without the new content.
    return db.$transaction(async (tx) => {
      const latest = await tx.ismsDocumentVersion.findFirst({
        where: { documentId, isLatest: true },
      });

      await invalidateApprovalIfNeeded({ tx, documentId });

      if (latest) {
        return tx.ismsDocumentVersion.update({
          where: { id: latest.id },
          data: { narrative: value },
        });
      }

      return tx.ismsDocumentVersion.create({
        data: { documentId, version: 1, isLatest: true, narrative: value },
      });
    });
  }
}
