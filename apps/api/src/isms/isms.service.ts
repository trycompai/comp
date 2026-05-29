import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { EnsureIsmsSetupDto } from './dto/ensure-isms-setup.dto';
import { SubmitIsmsForApprovalDto } from './dto/submit-isms-for-approval.dto';
import {
  ISMS_TYPE_DEFINITIONS,
  matchRequirementId,
} from './utils/document-types';
import { collectContextData } from './utils/context-data-source';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

/**
 * ISMS foundational document lifecycle: setup, retrieval and sign-off. Context
 * derivation/drift/export live in IsmsContextService and issue CRUD in
 * IsmsContextIssueService.
 */
@Injectable()
export class IsmsService {
  async ensureSetup(dto: EnsureIsmsSetupDto) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: dto.frameworkId },
      include: {
        requirements: { select: { id: true, name: true, identifier: true } },
      },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    const existing = await db.ismsDocument.findMany({
      where: {
        organizationId: dto.organizationId,
        frameworkId: dto.frameworkId,
      },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((doc) => doc.type));

    for (const def of ISMS_TYPE_DEFINITIONS) {
      if (existingTypes.has(def.type)) continue;
      const requirementId = matchRequirementId({
        clause: def.clause,
        requirements: framework.requirements,
      });
      await db.ismsDocument.create({
        data: {
          organizationId: dto.organizationId,
          frameworkId: dto.frameworkId,
          type: def.type,
          title: def.title,
          status: 'draft',
          requirementId,
        },
      });
    }

    const documents = await db.ismsDocument.findMany({
      where: {
        organizationId: dto.organizationId,
        frameworkId: dto.frameworkId,
      },
    });

    return {
      success: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        requirementId: doc.requirementId,
        hasApprovedVersion: doc.status === 'approved',
      })),
    };
  }

  async getDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        versions: { where: { isLatest: true }, take: 1 },
        contextIssues: { orderBy: { position: 'asc' } },
      },
    });

    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    return document;
  }

  async submitForApproval({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: SubmitIsmsForApprovalDto;
  }) {
    const approver = await db.member.findFirst({
      where: { id: dto.approverId, organizationId, deactivated: false },
    });
    if (!approver) {
      throw new NotFoundException('Approver not found in organization');
    }

    await this.requireDocument({ documentId, organizationId });

    return db.ismsDocument.update({
      where: { id: documentId },
      data: {
        approverId: dto.approverId,
        status: 'needs_review',
        approvedAt: null,
        declinedAt: null,
      },
    });
  }

  async approve({
    documentId,
    organizationId,
    userId,
  }: {
    documentId: string;
    organizationId: string;
    userId: string;
  }) {
    const member = await this.requireMember({ organizationId, userId });
    const document = await this.requireDocument({ documentId, organizationId });

    if (document.approverId && document.approverId !== member.id) {
      throw new ForbiddenException('Document is not pending your approval');
    }

    const snapshot = await collectContextData({
      organizationId,
      frameworkId: document.frameworkId,
    });

    await db.$transaction(async (tx) => {
      await upsertLatestSnapshotVersion({ tx, documentId, snapshot });
      await tx.ismsDocument.update({
        where: { id: documentId },
        data: { status: 'approved', approvedAt: new Date(), declinedAt: null },
      });
    });

    return this.getDocument({ documentId, organizationId });
  }

  async decline({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    await this.requireDocument({ documentId, organizationId });

    return db.ismsDocument.update({
      where: { id: documentId },
      data: { status: 'declined', declinedAt: new Date() },
    });
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
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }
    return document;
  }

  private async requireMember({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }) {
    const member = await db.member.findFirst({
      where: { organizationId, userId, deactivated: false },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return member;
  }
}
