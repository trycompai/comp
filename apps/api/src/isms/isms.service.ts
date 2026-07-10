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
import { roleValidationMessages, seedRolesIfMissing } from './documents/roles';
import { updateDraftSnapshot } from './utils/draft-snapshot';
import { EXPORT_DOCUMENT_INCLUDE } from './utils/export-payload';
import { lockDocument } from './utils/document-lock';
import { IsmsVersionService } from './isms-version.service';

/**
 * ISMS foundational document lifecycle: setup, retrieval and sign-off. Context
 * derivation/drift/export live in IsmsContextService and issue CRUD in
 * IsmsContextIssueService.
 */
@Injectable()
export class IsmsService {
  constructor(private readonly versionService: IsmsVersionService) {}

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
        // The document has an approved artifact: either a published version row
        // (approved under the versioning model) or `status === 'approved'` — the
        // latter covers documents approved before versioning existed, whose legacy
        // version rows were dropped by the migration and which capture a real
        // versioned artifact on their next approval.
        hasApprovedVersion:
          doc.currentVersionId != null || doc.status === 'approved',
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

    // Seed the four governance roles for a newly-created Roles document so they
    // are visible with default text on first load, without a Generate click.
    // Idempotent by roleKey, so concurrent provisioning calls can't duplicate.
    const rolesDoc = created.find(
      (doc) => doc.type === 'roles_and_responsibilities',
    );
    if (rolesDoc) {
      const memberCount = await db.member.count({
        where: { organizationId, deactivated: false },
      });
      await db.$transaction((tx) =>
        seedRolesIfMissing({ tx, documentId: rolesDoc.id, memberCount }),
      );
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
        // The live/published version, for the "Published: vN" display. Full
        // history is fetched separately via IsmsVersionService.getVersions.
        currentVersion: {
          select: { id: true, version: true, publishedAt: true },
        },
        contextIssues: { orderBy: { position: 'asc' } },
        interestedParties: { orderBy: { position: 'asc' } },
        interestedPartyRequirements: { orderBy: { position: 'asc' } },
        objectives: { orderBy: { position: 'asc' } },
        roles: {
          orderBy: { position: 'asc' },
          include: { assignments: { orderBy: { position: 'asc' } } },
        },
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

    const document = await this.requireDocument({ documentId, organizationId });

    // Clause 5.3 generate-time validation, enforced server-side so it can't be
    // bypassed by calling the API directly (the client disables Submit too).
    if (document.type === 'roles_and_responsibilities') {
      await this.assertRolesComplete({ documentId, organizationId });
    }

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
    const now = new Date();

    // Freeze the draft into a new immutable published version and promote it to
    // currentVersion. Editing afterwards reverts status to draft but leaves this
    // published version live and exportable (CS-701).
    const published = await db.$transaction(async (tx) => {
      // Serialize concurrent approvals (and register-row creates, which take the
      // same lock) on this document so they can't interleave and double-publish.
      await lockDocument(tx, documentId);

      // Atomically claim the approval: the check-then-act guard above runs before
      // the transaction, so under READ COMMITTED a racing approve/decline could
      // read the same stale `needs_review`. This conditional update only matches
      // while the document is still awaiting THIS member's review, so exactly one
      // caller proceeds; a loser matches zero rows and aborts before creating a
      // version. (A plain in-transaction re-read would not serialize.)
      const claim = await tx.ismsDocument.updateMany({
        where: {
          id: documentId,
          organizationId,
          status: 'needs_review',
          approverId: member.id,
        },
        data: { status: 'approved', approvedAt: now, declinedAt: null },
      });
      if (claim.count !== 1) {
        throw new BadRequestException('Document is not pending your approval');
      }

      // Re-derive in the same transaction so the persisted rows and the frozen
      // snapshot come from one pass (otherwise the approved content can drift).
      await runDerivation({
        tx,
        type: document.type,
        documentId,
        organizationId,
        frameworkId: document.frameworkId,
        data: snapshot,
      });
      await updateDraftSnapshot({ tx, documentId, snapshot });

      const reloaded = await tx.ismsDocument.findUniqueOrThrow({
        where: { id: documentId },
        include: EXPORT_DOCUMENT_INCLUDE,
      });
      const result = await this.versionService.createPublishedVersion({
        tx,
        document: reloaded,
        memberId: member.id,
        now,
        snapshotData: snapshot,
      });

      await tx.ismsDocument.update({
        where: { id: documentId },
        data: { currentVersionId: result.versionId },
      });
      return result;
    });

    // Render + upload the frozen exports outside the transaction (Policies
    // pattern) so an S3 hiccup never orphans the published version.
    await this.versionService.publishRenders({
      organizationId,
      documentId,
      versionId: published.versionId,
      version: published.version,
      snapshot: published.snapshot,
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

    // Atomically claim the decline so it can't race an approve (both pass the
    // pre-transaction guard). Only matches while still awaiting this member's
    // review, so a concurrent approve that already won leaves zero rows here.
    const claim = await db.ismsDocument.updateMany({
      where: {
        id: documentId,
        organizationId,
        status: 'needs_review',
        approverId: member.id,
      },
      data: { status: 'declined', declinedAt: new Date() },
    });
    if (claim.count !== 1) {
      throw new BadRequestException('Document is not pending your approval');
    }

    return this.getDocument({ documentId, organizationId });
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

  /**
   * Enforce clause-5.3 completeness before the Roles document can be submitted for
   * approval (each seeded role assigned — except Deputy SPO in the 1-3 band — and
   * the Internal Auditor route chosen). Mirrors the client-side gate.
   */
  private async assertRolesComplete({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const [roles, memberCount] = await Promise.all([
      db.ismsRole.findMany({
        where: { documentId },
        select: {
          roleKey: true,
          name: true,
          auditRoute: true,
          assignments: { select: { id: true } },
        },
      }),
      db.member.count({ where: { organizationId, deactivated: false } }),
    ]);
    const messages = roleValidationMessages({ roles, memberCount });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 5.3 document is not ready to submit. ${messages.join(' ')}`,
      );
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
