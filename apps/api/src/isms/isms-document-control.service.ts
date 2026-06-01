import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';

/**
 * Org-level mapping between an ISMS document and the organization's Controls
 * (CS-437). Mirrors the Policy<->Control mapping but over the explicit
 * IsmsDocumentControlLink junction. Everything is org-scoped: the document and
 * every control must belong to the caller's organization.
 */
@Injectable()
export class IsmsDocumentControlService {
  async addControls({
    documentId,
    organizationId,
    controlIds,
  }: {
    documentId: string;
    organizationId: string;
    controlIds: string[];
  }) {
    await this.requireDocument({ documentId, organizationId });

    const uniqueControlIds = Array.from(new Set(controlIds));
    const controls = await db.control.findMany({
      where: { id: { in: uniqueControlIds }, organizationId },
      select: { id: true },
    });
    if (controls.length !== uniqueControlIds.length) {
      throw new BadRequestException(
        'One or more controls do not belong to the organization',
      );
    }

    await db.ismsDocumentControlLink.createMany({
      data: uniqueControlIds.map((controlId) => ({
        ismsDocumentId: documentId,
        controlId,
      })),
      skipDuplicates: true,
    });
    return { message: 'Controls linked' };
  }

  async removeControl({
    documentId,
    organizationId,
    controlId,
  }: {
    documentId: string;
    organizationId: string;
    controlId: string;
  }) {
    await this.requireDocument({ documentId, organizationId });
    await db.ismsDocumentControlLink.deleteMany({
      where: { ismsDocumentId: documentId, controlId },
    });
    return { message: 'Control unlinked' };
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }
    return document;
  }
}
