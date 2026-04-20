import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  db,
  EvidenceFormType as DbEvidenceFormType,
  FindingArea,
  FindingSeverity,
  FindingStatus,
  FindingType,
} from '@db';
import {
  toDbEvidenceFormType,
  toExternalEvidenceFormType,
} from '@trycompai/company';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { FindingAuditService } from './finding-audit.service';
import { FindingNotifierService } from './finding-notifier.service';

// Target keys on Finding. Exactly one of these (or `area`) must be set per finding.
const TARGET_KEYS = [
  'taskId',
  'evidenceSubmissionId',
  'evidenceFormType',
  'policyId',
  'vendorId',
  'riskId',
  'memberId',
  'deviceId',
] as const;

@Injectable()
export class FindingsService {
  private readonly logger = new Logger(FindingsService.name);

  private readonly findingInclude = {
    createdBy: {
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    },
    createdByAdmin: {
      select: { id: true, name: true, email: true, image: true },
    },
    template: { select: { id: true, category: true, title: true } },
    task: { select: { id: true, title: true } },
    evidenceSubmission: {
      select: {
        id: true,
        formType: true,
        submittedAt: true,
        submittedById: true,
      },
    },
    policy: { select: { id: true, name: true } },
    vendor: { select: { id: true, name: true } },
    risk: { select: { id: true, title: true } },
    member: {
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    },
    device: { select: { id: true, name: true, hostname: true } },
  } as const;

  constructor(
    private readonly findingAuditService: FindingAuditService,
    private readonly findingNotifierService: FindingNotifierService,
  ) {}

  private normalizeFindingFormTypes<
    T extends {
      evidenceFormType: DbEvidenceFormType | null;
      evidenceSubmission?: { formType: DbEvidenceFormType } | null;
    },
  >(finding: T) {
    return {
      ...finding,
      evidenceFormType: toExternalEvidenceFormType(finding.evidenceFormType),
      evidenceSubmission: finding.evidenceSubmission
        ? {
            ...finding.evidenceSubmission,
            formType:
              toExternalEvidenceFormType(finding.evidenceSubmission.formType) ??
              'meeting',
          }
        : null,
    };
  }

  /**
   * List findings for an organization with optional target/status/severity filters.
   * Supersedes the previous per-target list endpoints.
   */
  async listForOrganization(
    organizationId: string,
    filters: {
      status?: FindingStatus;
      severity?: FindingSeverity;
      taskId?: string;
      evidenceSubmissionId?: string;
      evidenceFormType?: DbEvidenceFormType;
      policyId?: string;
      vendorId?: string;
      riskId?: string;
      memberId?: string;
      deviceId?: string;
      area?: FindingArea;
    } = {},
  ) {
    const findings = await db.finding.findMany({
      where: {
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.taskId && { taskId: filters.taskId }),
        ...(filters.evidenceSubmissionId && {
          evidenceSubmissionId: filters.evidenceSubmissionId,
        }),
        ...(filters.evidenceFormType && {
          evidenceFormType: filters.evidenceFormType,
        }),
        ...(filters.policyId && { policyId: filters.policyId }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.riskId && { riskId: filters.riskId }),
        ...(filters.memberId && { memberId: filters.memberId }),
        ...(filters.deviceId && { deviceId: filters.deviceId }),
        ...(filters.area && { area: filters.area }),
      },
      include: this.findingInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    this.logger.log(
      `Retrieved ${findings.length} findings for org ${organizationId}`,
    );
    return findings.map((f) => this.normalizeFindingFormTypes(f));
  }

  async findById(organizationId: string, findingId: string) {
    const finding = await db.finding.findFirst({
      where: { id: findingId, organizationId },
      include: this.findingInclude,
    });

    if (!finding) {
      throw new NotFoundException(
        `Finding with ID ${findingId} not found in organization`,
      );
    }

    return this.normalizeFindingFormTypes(finding);
  }

  /** Validate a create DTO: exactly one target OR area, plus that any referenced entity exists. */
  private async resolveTarget(
    organizationId: string,
    createDto: CreateFindingDto,
  ) {
    const providedTargets = TARGET_KEYS.filter((key) =>
      Boolean(createDto[key]),
    );
    const targetCount = providedTargets.length + (createDto.area ? 1 : 0);

    if (targetCount === 0) {
      throw new BadRequestException(
        'One of taskId, evidenceSubmissionId, evidenceFormType, policyId, vendorId, riskId, memberId, deviceId, or area is required',
      );
    }
    if (targetCount > 1) {
      throw new BadRequestException(
        'Provide only one target for the finding',
      );
    }

    // Validate each entity belongs to this organization (for FK targets)
    if (createDto.taskId) {
      const task = await db.task.findFirst({
        where: { id: createDto.taskId, organizationId },
        select: { id: true, title: true },
      });
      if (!task) throw new NotFoundException(`Task ${createDto.taskId} not found`);
      return { kind: 'task' as const, id: task.id, label: task.title };
    }
    if (createDto.evidenceSubmissionId) {
      const submission = await db.evidenceSubmission.findFirst({
        where: { id: createDto.evidenceSubmissionId, organizationId },
        select: { id: true, formType: true, submittedById: true },
      });
      if (!submission)
        throw new NotFoundException(
          `Evidence submission ${createDto.evidenceSubmissionId} not found`,
        );
      return {
        kind: 'evidenceSubmission' as const,
        id: submission.id,
        formType: submission.formType,
        submittedById: submission.submittedById,
        label:
          toExternalEvidenceFormType(submission.formType) ??
          submission.formType,
      };
    }
    if (createDto.evidenceFormType) {
      return {
        kind: 'evidenceFormType' as const,
        id: createDto.evidenceFormType,
        label: createDto.evidenceFormType,
      };
    }
    if (createDto.policyId) {
      const policy = await db.policy.findFirst({
        where: { id: createDto.policyId, organizationId },
        select: { id: true, name: true },
      });
      if (!policy)
        throw new NotFoundException(`Policy ${createDto.policyId} not found`);
      return { kind: 'policy' as const, id: policy.id, label: policy.name };
    }
    if (createDto.vendorId) {
      const vendor = await db.vendor.findFirst({
        where: { id: createDto.vendorId, organizationId },
        select: { id: true, name: true },
      });
      if (!vendor)
        throw new NotFoundException(`Vendor ${createDto.vendorId} not found`);
      return { kind: 'vendor' as const, id: vendor.id, label: vendor.name };
    }
    if (createDto.riskId) {
      const risk = await db.risk.findFirst({
        where: { id: createDto.riskId, organizationId },
        select: { id: true, title: true },
      });
      if (!risk)
        throw new NotFoundException(`Risk ${createDto.riskId} not found`);
      return { kind: 'risk' as const, id: risk.id, label: risk.title };
    }
    if (createDto.memberId) {
      const member = await db.member.findFirst({
        where: { id: createDto.memberId, organizationId },
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      if (!member)
        throw new NotFoundException(`Member ${createDto.memberId} not found`);
      return {
        kind: 'member' as const,
        id: member.id,
        userId: member.user.id,
        label: member.user.name ?? member.user.email,
      };
    }
    if (createDto.deviceId) {
      const device = await db.device.findFirst({
        where: { id: createDto.deviceId, organizationId },
        select: { id: true, name: true, hostname: true, memberId: true },
      });
      if (!device)
        throw new NotFoundException(`Device ${createDto.deviceId} not found`);
      return {
        kind: 'device' as const,
        id: device.id,
        memberId: device.memberId,
        label: device.name || device.hostname,
      };
    }
    return { kind: 'area' as const, id: null, label: createDto.area! };
  }

  /** Create a finding (auditor or platform admin only). */
  async create(
    organizationId: string,
    memberId: string | null,
    userId: string,
    createDto: CreateFindingDto,
  ) {
    const target = await this.resolveTarget(organizationId, createDto);

    if (createDto.templateId) {
      const template = await db.findingTemplate.findUnique({
        where: { id: createDto.templateId },
      });
      if (!template)
        throw new BadRequestException(
          `Finding template with ID ${createDto.templateId} not found`,
        );
    }

    const finding = await db.finding.create({
      data: {
        taskId: createDto.taskId ?? null,
        evidenceSubmissionId: createDto.evidenceSubmissionId ?? null,
        evidenceFormType: createDto.evidenceFormType
          ? toDbEvidenceFormType(createDto.evidenceFormType)
          : null,
        policyId: createDto.policyId ?? null,
        vendorId: createDto.vendorId ?? null,
        riskId: createDto.riskId ?? null,
        memberId: createDto.memberId ?? null,
        deviceId: createDto.deviceId ?? null,
        area: createDto.area ?? null,
        type: createDto.type,
        severity: createDto.severity,
        content: createDto.content,
        templateId: createDto.templateId,
        createdById: memberId,
        createdByAdminId: memberId ? null : userId,
        organizationId,
        status: FindingStatus.open,
      },
      include: this.findingInclude,
    });

    // Creation is already logged by the global AuditLogInterceptor via
    // `extractFindingDescription` — no explicit call here, otherwise the
    // activity feed shows two "created" entries per finding.

    const actorName =
      finding.createdBy?.user?.name ||
      finding.createdBy?.user?.email ||
      finding.createdByAdmin?.name ||
      finding.createdByAdmin?.email ||
      'Someone';

    void this.findingNotifierService.notifyFindingCreated({
      organizationId,
      finding,
      actorUserId: userId,
      actorName,
    });

    this.logger.log(`Created finding ${finding.id} for ${target.kind}`);
    return this.normalizeFindingFormTypes(finding);
  }

  /**
   * Update a finding with role-based status transition validation.
   */
  async update(
    organizationId: string,
    findingId: string,
    updateDto: UpdateFindingDto,
    userRoles: string[],
    isPlatformAdmin: boolean,
    userId: string,
    memberId: string | null,
  ) {
    const finding = await this.findById(organizationId, findingId);
    const previousStatus = finding.status;
    const previousType = finding.type;
    const previousContent = finding.content;

    if (updateDto.status) {
      const isAuditor = userRoles.includes('auditor');
      const canSetRestrictedStatus = isPlatformAdmin || isAuditor;

      if (
        (updateDto.status === FindingStatus.needs_revision ||
          updateDto.status === FindingStatus.closed) &&
        !canSetRestrictedStatus
      ) {
        throw new ForbiddenException(
          `Only auditors or platform admins can set status to '${updateDto.status}'`,
        );
      }

      if (
        updateDto.status === FindingStatus.ready_for_review &&
        isAuditor &&
        !isPlatformAdmin
      ) {
        throw new ForbiddenException(
          `Auditors cannot set status to 'ready_for_review'. This status is for clients to signal readiness.`,
        );
      }
    }

    let revisionNoteUpdate: { revisionNote?: string | null } = {};
    if (updateDto.status === FindingStatus.needs_revision) {
      if (updateDto.revisionNote !== undefined) {
        revisionNoteUpdate = { revisionNote: updateDto.revisionNote || null };
      }
    } else if (updateDto.status !== undefined) {
      revisionNoteUpdate = { revisionNote: null };
    }

    const updatedFinding = await db.finding.update({
      where: { id: findingId },
      data: {
        ...(updateDto.status !== undefined && { status: updateDto.status }),
        ...(updateDto.type !== undefined && { type: updateDto.type }),
        ...(updateDto.severity !== undefined && {
          severity: updateDto.severity,
        }),
        ...(updateDto.content !== undefined && { content: updateDto.content }),
        ...revisionNoteUpdate,
      },
      include: this.findingInclude,
    });

    const auditParams = { findingId, organizationId, userId, memberId };

    if (updateDto.status && updateDto.status !== previousStatus) {
      await this.findingAuditService.logFindingStatusChanged({
        ...auditParams,
        previousStatus,
        newStatus: updateDto.status,
      });
    }
    if (updateDto.type && updateDto.type !== previousType) {
      await this.findingAuditService.logFindingTypeChanged({
        ...auditParams,
        previousType,
        newType: updateDto.type,
      });
    }
    if (updateDto.content && updateDto.content !== previousContent) {
      await this.findingAuditService.logFindingContentUpdated({
        ...auditParams,
        previousContent,
        newContent: updateDto.content,
      });
    }

    if (updateDto.status && updateDto.status !== previousStatus) {
      const actorUser = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      const actorName = actorUser?.name || actorUser?.email || 'Someone';

      void this.findingNotifierService.notifyStatusChanged({
        organizationId,
        finding: updatedFinding,
        actorUserId: userId,
        actorName,
        newStatus: updateDto.status,
      });
    }

    this.logger.log(
      `Updated finding ${findingId}: status=${updatedFinding.status}`,
    );
    return this.normalizeFindingFormTypes(updatedFinding);
  }

  async delete(
    organizationId: string,
    findingId: string,
    userId: string,
    memberId: string,
  ) {
    const finding = await this.findById(organizationId, findingId);

    await db.finding.delete({ where: { id: findingId } });

    // Deletion is already logged by the global AuditLogInterceptor via
    // `extractFindingDescription`. No explicit call here to avoid a
    // duplicate activity entry.

    this.logger.log(`Deleted finding ${findingId}`);
    return {
      message: 'Finding deleted successfully',
      deletedFinding: { id: finding.id },
    };
  }

  async getActivity(organizationId: string, findingId: string) {
    await this.findById(organizationId, findingId);
    return this.findingAuditService.getFindingActivity(
      findingId,
      organizationId,
    );
  }
}
