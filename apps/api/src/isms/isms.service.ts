import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { SubmitIsmsForApprovalDto } from './dto/submit-isms-for-approval.dto';
import {
  deriveControlLinks,
  resolveDocumentPlans,
} from './utils/ensure-setup-plan';
import { collectPlatformData } from './documents/data-source';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

/**
 * ISMS foundational document lifecycle: setup, retrieval and sign-off. Context
 * derivation/drift/export live in IsmsContextService and issue CRUD in
 * IsmsContextIssueService.
 */
@Injectable()
export class IsmsService {
  async ensureSetup({
    organizationId,
    frameworkId,
  }: {
    organizationId: string;
    frameworkId: string;
  }) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      include: {
        requirements: { select: { id: true, name: true, identifier: true } },
      },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    const existing = await db.ismsDocument.findMany({
      where: {
        organizationId: organizationId,
        frameworkId: frameworkId,
      },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((doc) => doc.type));

    const plans = await resolveDocumentPlans({
      frameworkId: frameworkId,
      requirements: framework.requirements,
    });

    for (const plan of plans) {
      if (existingTypes.has(plan.type)) continue;
      const document = await db.ismsDocument.create({
        data: {
          organizationId: organizationId,
          frameworkId: frameworkId,
          type: plan.type,
          title: plan.title,
          status: 'draft',
          requirementId: plan.requirementId,
          templateId: plan.templateId,
        },
      });
      await deriveControlLinks({
        documentId: document.id,
        organizationId: organizationId,
        controlTemplateIds: plan.controlTemplateIds,
      });
    }

    const documents = await db.ismsDocument.findMany({
      where: {
        organizationId: organizationId,
        frameworkId: frameworkId,
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
        interestedParties: { orderBy: { position: 'asc' } },
        interestedPartyRequirements: { orderBy: { position: 'asc' } },
        objectives: { orderBy: { position: 'asc' } },
        controlLinks: {
          select: {
            id: true,
            controlId: true,
            control: { select: { id: true, name: true } },
          },
        },
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
    this.assertPendingApprovalBy({ document, member });

    const snapshot = await collectPlatformData({
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
    userId,
  }: {
    documentId: string;
    organizationId: string;
    userId: string;
  }) {
    const member = await this.requireMember({ organizationId, userId });
    const document = await this.requireDocument({ documentId, organizationId });
    this.assertPendingApprovalBy({ document, member });

    return db.ismsDocument.update({
      where: { id: documentId },
      data: { status: 'declined', declinedAt: new Date() },
    });
  }

  /**
   * Guard shared by approve/decline: the document must be awaiting review and the
   * acting member must be its assigned approver.
   */
  private assertPendingApprovalBy({
    document,
    member,
  }: {
    document: { status: string; approverId: string | null };
    member: { id: string };
  }) {
    if (document.status !== 'needs_review') {
      throw new BadRequestException('Document is not pending approval');
    }
    if (!document.approverId || document.approverId !== member.id) {
      throw new ForbiddenException('Document is not pending your approval');
    }
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
