import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import type { IsmsDocumentType } from '@db';
import { SubmitIsmsForApprovalDto } from './dto/submit-isms-for-approval.dto';
import { deriveControlLinks, resolveDocumentPlans } from './utils/ensure-setup-plan';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import { roleValidationMessages, seedRolesIfMissing } from './documents/roles';
import {
  metricValidationMessages,
  seedMetricsIfMissing,
} from './documents/monitoring';
import { auditValidationMessages } from './documents/internal-audit';
import { defaultProgrammeText } from './documents/internal-audit-defaults';
import {
  isReviewSigned,
  managementReviewNarrativeSchema,
  parseReviewAttendees,
  reviewValidationMessages,
} from './documents/management-review';
import { defaultProcedureText } from './documents/management-review-defaults';
import { defaultRiskMethodologyNarrative } from './documents/risk-methodology';
import { loadRiskTreatmentExtras } from './documents/risk-treatment-export-data';
import { riskTreatmentValidationMessages } from './documents/risk-treatment-plan';
import { updateDraftSnapshot } from './utils/draft-snapshot';
import { EXPORT_DOCUMENT_INCLUDE } from './utils/export-payload';
import { lockDocument } from './utils/document-lock';
import {
  isMetricOverdue,
  periodStartFor,
  toPeriodKey,
  type MetricCadenceValue,
} from './utils/metric-periods';
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

    // Heal empty Programme (9.2) / Procedure (9.3) paragraphs on EVERY setup,
    // not just for documents created this call: a document provisioned before
    // its narrative seed shipped (or a crash between provision and seed) would
    // otherwise stay blank forever. Guarded per doc on the narrative still
    // being empty, so a populated draft is never overwritten.
    if (canWrite) {
      await this.seedNarrativeDefaultsIfEmpty({ documents, organizationId });
    }

    const monitoringDoc = documents.find((doc) => doc.type === 'monitoring');
    const overdueMetricCount = monitoringDoc
      ? await this.countOverdueMetrics(monitoringDoc.id)
      : 0;

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
        // The ISMS overview's "Metrics overdue" tile (CS-723); only meaningful
        // on the monitoring document row.
        ...(doc.type === 'monitoring' ? { overdueMetricCount } : {}),
      })),
    };
  }

  /**
   * Metrics whose most recent measurement's period is older than the cadence
   * allows (the CS-723 overdue signal — see isMetricOverdue). Powers the ISMS
   * overview tile; the Monitoring page derives the same state client-side.
   */
  private async countOverdueMetrics(documentId: string): Promise<number> {
    const metrics = await db.ismsMetric.findMany({
      where: { documentId, isActive: true, cadence: { not: null } },
      select: {
        cadence: true,
        createdAt: true,
        measurements: {
          orderBy: { periodStart: 'desc' },
          take: 1,
          select: { periodStart: true },
        },
      },
    });
    const now = new Date();
    return metrics.filter((metric) => {
      const cadence = metric.cadence as MetricCadenceValue;
      const latest = metric.measurements[0]
        ? toPeriodKey(metric.measurements[0].periodStart)
        : null;
      return isMetricOverdue({
        cadence,
        latestMeasured: latest,
        // Anchor is only consulted when there are no measurements at all, so
        // the creation period is sufficient here.
        anchor: periodStartFor(cadence, metric.createdAt),
        now,
      });
    }).length;
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

    // Same first-load guarantee for Monitoring (9.1): the nine default metrics
    // are active from day one. Idempotent by metricKey.
    const monitoringDoc = created.find((doc) => doc.type === 'monitoring');
    if (monitoringDoc) {
      await db.$transaction((tx) =>
        seedMetricsIfMissing({ tx, documentId: monitoringDoc.id }),
      );
    }

    // The Programme (9.2) / Procedure (9.3) narrative seed happens in
    // ensureSetup (seedNarrativeDefaultsIfEmpty), AFTER the document list is
    // fetched — so it covers both the documents this call just created and
    // any pre-existing document whose narrative is still empty.
  }

  /**
   * First-load guarantee for Internal Audit (9.2) and Management Review (9.3):
   * the Programme / Procedure paragraph opens with its default text. Each
   * write is conditional on the narrative still being empty — NULL (the
   * creation state) or {}, generateNarrative's definition — so it is atomic:
   * under concurrent setup calls, an early customer edit can never be
   * clobbered (the seed simply matches zero rows).
   */
  private async seedNarrativeDefaultsIfEmpty({
    documents,
    organizationId,
  }: {
    documents: Array<{
      id: string;
      type: IsmsDocumentType;
      draftNarrative: Prisma.JsonValue;
    }>;
    organizationId: string;
  }) {
    const isEmptyNarrative = (narrative: Prisma.JsonValue): boolean =>
      narrative == null ||
      (typeof narrative === 'object' &&
        !Array.isArray(narrative) &&
        Object.keys(narrative).length === 0);

    const targets = documents.filter(
      (doc) =>
        (doc.type === 'internal_audit' ||
          doc.type === 'management_review' ||
          doc.type === 'risk_assessment_methodology') &&
        isEmptyNarrative(doc.draftNarrative),
    );
    if (targets.length === 0) return;

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const organizationName = organization?.name ?? 'The organization';
    const whileNarrativeEmpty = {
      OR: [
        { draftNarrative: { equals: Prisma.AnyNull } },
        { draftNarrative: { equals: {} } },
      ],
    };
    const defaultNarrativeFor = (
      type: IsmsDocumentType,
    ): Prisma.InputJsonObject => {
      if (type === 'internal_audit') {
        return { programme: defaultProgrammeText(organizationName) };
      }
      if (type === 'management_review') {
        return { procedure: defaultProcedureText(organizationName) };
      }
      // risk_assessment_methodology (6.1.2): the fully templated default text.
      return { ...defaultRiskMethodologyNarrative(organizationName) };
    };
    for (const doc of targets) {
      await db.ismsDocument.updateMany({
        where: { id: doc.id, ...whileNarrativeEmpty },
        data: { draftNarrative: defaultNarrativeFor(doc.type) },
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
        metrics: {
          orderBy: { position: 'asc' },
          include: {
            // Full history, newest first: the Monitoring page renders it and
            // derives due/overdue/backfill periods client-side from it.
            measurements: {
              orderBy: [{ periodStart: 'desc' }, { recordedAt: 'desc' }],
            },
            objective: { select: { id: true, objective: true, target: true } },
          },
        },
        audits: {
          orderBy: { position: 'asc' },
          include: {
            controls: { orderBy: { position: 'asc' } },
            findings: { orderBy: { position: 'asc' } },
          },
        },
        reviews: {
          // Same deterministic ordering as EXPORT_DOCUMENT_INCLUDE: the client
          // computes the carried-forward lists from this order.
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          include: {
            inputs: { orderBy: { position: 'asc' } },
            actions: { orderBy: { position: 'asc' } },
          },
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

    return db.$transaction(async (tx) => {
      // Serialize with concurrent register edits (which take the same per-document
      // lock) so the completeness check and the status flip are atomic — an edit
      // can't invalidate the document between validation and the transition to
      // needs_review (TOCTOU). Validate inside the lock, then transition.
      await lockDocument(tx, documentId);

      // Clause 5.3 generate-time validation, enforced server-side so it can't be
      // bypassed by calling the API directly (the client disables Submit too).
      if (document.type === 'roles_and_responsibilities') {
        await this.assertRolesComplete({ tx, documentId, organizationId });
      }
      // Clause 9.1: at least one active metric, each with a cadence (CS-723).
      if (document.type === 'monitoring') {
        await this.assertMonitoringComplete({ tx, documentId });
      }
      // Clause 9.2: at least one audit, and a conclusion verdict on every
      // completed audit (CS-724).
      if (document.type === 'internal_audit') {
        await this.assertInternalAuditComplete({ tx, documentId });
      }
      // Clause 9.3: the Procedure paragraph plus, on every completed review,
      // a meeting date, chair, at least one attendee, every input discussed,
      // and the chair's signature (CS-726).
      if (document.type === 'management_review') {
        await this.assertManagementReviewComplete({ tx, documentId });
      }
      // Clause 6.1.3: at least one risk recorded and an owner on every risk
      // and vendor; per-risk acceptance is recommended, never blocking (CS-727).
      if (document.type === 'risk_treatment_plan') {
        await this.assertRiskTreatmentPlanComplete({ tx, organizationId });
      }

      return tx.ismsDocument.update({
        where: { id: documentId },
        data: {
          approverId: dto.approverId,
          status: 'needs_review',
          approvedAt: null,
          declinedAt: null,
        },
      });
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
    tx,
    documentId,
    organizationId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
    organizationId: string;
  }) {
    const [roles, activeMembers] = await Promise.all([
      tx.ismsRole.findMany({
        where: { documentId },
        select: {
          roleKey: true,
          name: true,
          auditRoute: true,
          auditRouteMemberId: true,
          auditFirmName: true,
          auditEvidenceRef: true,
          auditCourse: true,
          auditDueDate: true,
          assignments: { select: { memberId: true } },
        },
      }),
      tx.member.findMany({
        where: { organizationId, deactivated: false },
        select: { id: true },
      }),
    ]);
    // A role "assigned" only to a deactivated/removed member is not really
    // covered — count only assignments that resolve to an active member.
    // roleValidationMessages counts only assignments (and audit-route members)
    // that resolve to an active member, so pass the raw rows + the active set.
    const activeMemberIds = new Set(activeMembers.map((member) => member.id));
    const messages = roleValidationMessages({
      roles,
      memberCount: activeMemberIds.size,
      activeMemberIds,
    });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 5.3 document is not ready to submit. ${messages.join(' ')}`,
      );
    }
  }

  private async assertMonitoringComplete({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const metrics = await tx.ismsMetric.findMany({
      where: { documentId },
      select: { name: true, cadence: true, isActive: true },
    });
    const messages = metricValidationMessages({ metrics });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 9.1 document is not ready to submit. ${messages.join(' ')}`,
      );
    }
  }

  private async assertInternalAuditComplete({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const audits = await tx.ismsAudit.findMany({
      where: { documentId },
      select: { reference: true, status: true, conclusionVerdict: true },
    });
    const messages = auditValidationMessages({ audits });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 9.2 document is not ready to submit. ${messages.join(' ')}`,
      );
    }
  }

  private async assertManagementReviewComplete({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const [document, reviews] = await Promise.all([
      tx.ismsDocument.findUnique({
        where: { id: documentId },
        select: { draftNarrative: true },
      }),
      tx.ismsManagementReview.findMany({
        where: { documentId },
        select: {
          reference: true,
          status: true,
          meetingDate: true,
          chairName: true,
          attendees: true,
          signoffChairName: true,
          signoffChairDate: true,
          inputs: { select: { discussed: true } },
        },
      }),
    ]);
    const narrative = managementReviewNarrativeSchema.safeParse(
      document?.draftNarrative,
    );
    const messages = reviewValidationMessages({
      procedure: narrative.success ? narrative.data.procedure : null,
      reviews: reviews.map((review) => ({
        reference: review.reference,
        status: review.status,
        hasMeetingDate: review.meetingDate != null,
        hasChair: Boolean(review.chairName?.trim()),
        attendeeCount: parseReviewAttendees(review.attendees).length,
        undiscussedInputCount: review.inputs.filter(
          (input) => !input.discussed,
        ).length,
        signed: isReviewSigned(review),
      })),
    });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 9.3 document is not ready to submit. ${messages.join(' ')}`,
      );
    }
  }

  /**
   * Clause-6.1.3 readiness: the RTP renders from the platform Risk Register +
   * Vendors (org-scoped), not from register rows of its own — so readiness
   * reads those tables. Archived risks are out of the plan (see
   * loadRiskTreatmentExtras). Shared by the submit gate and the page payload.
   */
  private async riskTreatmentReadinessMessages({
    organizationId,
    client,
  }: {
    organizationId: string;
    client?: Prisma.TransactionClient;
  }): Promise<string[]> {
    const dbc = client ?? db;
    const [risks, vendors] = await Promise.all([
      dbc.risk.findMany({
        where: { organizationId, status: { not: 'archived' } },
        select: { assigneeId: true },
      }),
      dbc.vendor.findMany({
        where: { organizationId },
        select: { assigneeId: true },
      }),
    ]);
    return riskTreatmentValidationMessages({
      riskCount: risks.length,
      risksWithoutOwner: risks.filter((risk) => !risk.assigneeId).length,
      vendorsWithoutOwner: vendors.filter((vendor) => !vendor.assigneeId)
        .length,
    });
  }

  private async assertRiskTreatmentPlanComplete({
    tx,
    organizationId,
  }: {
    tx: Prisma.TransactionClient;
    organizationId: string;
  }) {
    const messages = await this.riskTreatmentReadinessMessages({
      organizationId,
      client: tx,
    });
    if (messages.length > 0) {
      throw new BadRequestException(
        `This Clause 6.1.3 document is not ready to submit. ${messages.join(' ')}`,
      );
    }
  }

  /**
   * The Risk Treatment Plan page payload: the same rows the export renders
   * (from the Risk Register + Vendors) plus the submit-readiness messages.
   * Gated at evidence:read — consistent with every other ISMS read — so the
   * preview never depends on the viewer holding risk/vendor permissions.
   */
  async getRiskTreatmentData({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await this.requireDocument({ documentId, organizationId });
    if (document.type !== 'risk_treatment_plan') {
      throw new BadRequestException(
        'This document is not a Risk Treatment Plan',
      );
    }
    const [extras, validationMessages] = await Promise.all([
      loadRiskTreatmentExtras({ organizationId }),
      this.riskTreatmentReadinessMessages({ organizationId }),
    ]);
    return { ...extras, validationMessages };
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
