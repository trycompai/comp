import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { SubmitIsmsForApprovalDto } from './dto/submit-isms-for-approval.dto';
import { deriveControlLinks, resolveDocumentPlans } from './utils/ensure-setup-plan';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

/**
 * ISMS foundational document lifecycle: setup, retrieval and sign-off. Context
 * derivation/drift/export live in IsmsContextService and issue CRUD in
 * IsmsContextIssueService.
 */
@Injectable()
export class IsmsService {
  /**
   * List the org's ISMS documents, provisioning missing ones first only when the
   * caller can write (`evidence:update`). Read-only callers never trigger writes.
   */
  async ensureSetup({
    organizationId,
    frameworkId,
    canWrite,
  }: {
    organizationId: string;
    frameworkId: string;
    canWrite: boolean;
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

    if (canWrite) {
      await this.provisionMissingDocuments({
        organizationId,
        frameworkId,
        requirements: framework.requirements,
      });
    }

    const documents = await db.ismsDocument.findMany({
      where: { organizationId, frameworkId },
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

  /**
   * Create any missing ISMS documents for the (org, framework), then derive
   * control links for just the newly-created types so manual links on existing
   * documents stay untouched. `createMany` + `skipDuplicates` makes this safe
   * under concurrent calls — the unique (org, framework, type) constraint
   * absorbs the race, mirroring the idempotent ensureProfile pattern.
   */
  private async provisionMissingDocuments({
    organizationId,
    frameworkId,
    requirements,
  }: {
    organizationId: string;
    frameworkId: string;
    requirements: Array<{ id: string; name: string; identifier: string }>;
  }) {
    const existing = await db.ismsDocument.findMany({
      where: { organizationId, frameworkId },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((doc) => doc.type));

    const plans = await resolveDocumentPlans({ frameworkId, requirements });
    const missingPlans = plans.filter((plan) => !existingTypes.has(plan.type));
    if (missingPlans.length === 0) return;

    await db.ismsDocument.createMany({
      data: missingPlans.map((plan) => ({
        organizationId,
        frameworkId,
        type: plan.type,
        title: plan.title,
        status: 'draft',
        requirementId: plan.requirementId,
        templateId: plan.templateId,
      })),
      skipDuplicates: true,
    });

    const created = await db.ismsDocument.findMany({
      where: {
        organizationId,
        frameworkId,
        type: { in: missingPlans.map((plan) => plan.type) },
      },
      select: { id: true, type: true },
    });
    const controlTemplatesByType = new Map(
      missingPlans.map((plan) => [plan.type, plan.controlTemplateIds]),
    );

    for (const doc of created) {
      await deriveControlLinks({
        documentId: doc.id,
        organizationId,
        controlTemplateIds: controlTemplatesByType.get(doc.type) ?? [],
      });
    }
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
      // Re-derive in the same transaction so the persisted rows and the snapshot
      // baseline come from one pass (otherwise the approved content can drift).
      await runDerivation({
        tx,
        type: document.type,
        documentId,
        organizationId,
        frameworkId: document.frameworkId,
        data: snapshot,
      });
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
