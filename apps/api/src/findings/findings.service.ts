import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { db, FindingStatus, FindingType } from '@trycompai/db';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { FindingAuditService } from './finding-audit.service';
import { FindingNotifierService } from './finding-notifier.service';

@Injectable()
export class FindingsService {
  private readonly logger = new Logger(FindingsService.name);

  constructor(
    private readonly findingAuditService: FindingAuditService,
    private readonly findingNotifierService: FindingNotifierService,
  ) {}

  /**
   * Get all findings for a specific task
   */
  async findByTaskId(organizationId: string, taskId: string) {
    // Verify task belongs to organization
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException(
        `Task with ID ${taskId} not found in organization`,
      );
    }

    const findings = await db.finding.findMany({
      where: { taskId, organizationId },
      include: {
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            category: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        // Sort by status: open first, then ready_for_review, needs_revision, closed
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    this.logger.log(`Retrieved ${findings.length} findings for task ${taskId}`);
    return findings;
  }

  /**
   * Get all findings for an organization
   */
  async findByOrganizationId(organizationId: string, status?: FindingStatus) {
    const findings = await db.finding.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      include: {
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            category: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    this.logger.log(
      `Retrieved ${findings.length} findings for organization ${organizationId}`,
    );
    return findings;
  }

  /**
   * Get a single finding by ID
   */
  async findById(organizationId: string, findingId: string) {
    const finding = await db.finding.findFirst({
      where: { id: findingId, organizationId },
      include: {
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            category: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!finding) {
      throw new NotFoundException(
        `Finding with ID ${findingId} not found in organization`,
      );
    }

    return finding;
  }

  /**
   * Create a new finding (auditor or platform admin only)
   */
  async create(
    organizationId: string,
    memberId: string,
    userId: string,
    createDto: CreateFindingDto,
  ) {
    // Verify task belongs to organization
    const task = await db.task.findFirst({
      where: { id: createDto.taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException(
        `Task with ID ${createDto.taskId} not found in organization`,
      );
    }

    // Verify template exists if provided
    if (createDto.templateId) {
      const template = await db.findingTemplate.findUnique({
        where: { id: createDto.templateId },
      });

      if (!template) {
        throw new BadRequestException(
          `Finding template with ID ${createDto.templateId} not found`,
        );
      }
    }

    const finding = await db.finding.create({
      data: {
        taskId: createDto.taskId,
        type: createDto.type,
        content: createDto.content,
        templateId: createDto.templateId,
        createdById: memberId,
        organizationId,
        status: FindingStatus.open,
      },
      include: {
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            category: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Log to audit trail
    await this.findingAuditService.logFindingCreated({
      findingId: finding.id,
      organizationId,
      userId,
      memberId,
      taskId: createDto.taskId,
      taskTitle: task.title,
      content: createDto.content,
      type: createDto.type ?? FindingType.soc2,
    });

    // Send notifications (fire-and-forget)
    const actorName =
      finding.createdBy?.user?.name ||
      finding.createdBy?.user?.email ||
      'Someone';
    void this.findingNotifierService.notifyFindingCreated({
      organizationId,
      findingId: finding.id,
      taskId: createDto.taskId,
      taskTitle: task.title,
      findingContent: createDto.content,
      findingType: createDto.type ?? FindingType.soc2,
      actorUserId: userId,
      actorName,
    });

    this.logger.log(
      `Created finding ${finding.id} for task ${createDto.taskId}`,
    );
    return finding;
  }

  /**
   * Update a finding with role-based status transition validation
   *
   * Status transition rules:
   * - ready_for_review: Only non-auditor admins/owners can set (clients signal to auditor)
   * - needs_revision, closed: Only auditor or platform admin
   */
  async update(
    organizationId: string,
    findingId: string,
    updateDto: UpdateFindingDto,
    userRoles: string[],
    isPlatformAdmin: boolean,
    userId: string,
    memberId: string,
  ) {
    // Verify finding exists and get current state for audit
    const finding = await this.findById(organizationId, findingId);
    const previousStatus = finding.status;
    const previousType = finding.type;
    const previousContent = finding.content;

    // Validate status transition permissions
    if (updateDto.status) {
      const isAuditor = userRoles.includes('auditor');
      const canSetRestrictedStatus = isPlatformAdmin || isAuditor;

      // needs_revision and closed can only be set by auditor or platform admin
      if (
        (updateDto.status === FindingStatus.needs_revision ||
          updateDto.status === FindingStatus.closed) &&
        !canSetRestrictedStatus
      ) {
        throw new ForbiddenException(
          `Only auditors or platform admins can set status to '${updateDto.status}'`,
        );
      }

      // ready_for_review can only be set by non-auditor admins/owners (client signals to auditor)
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

    // Handle revisionNote logic:
    // - Set revisionNote when status is needs_revision and a note is provided
    // - Clear revisionNote when status changes to anything other than needs_revision
    let revisionNoteUpdate: { revisionNote?: string | null } = {};
    if (updateDto.status === FindingStatus.needs_revision) {
      // Set revision note if provided (can be null to clear)
      if (updateDto.revisionNote !== undefined) {
        revisionNoteUpdate = { revisionNote: updateDto.revisionNote || null };
      }
    } else if (updateDto.status !== undefined) {
      // Clear revision note when moving to a different status
      revisionNoteUpdate = { revisionNote: null };
    }

    const updatedFinding = await db.finding.update({
      where: { id: findingId },
      data: {
        ...(updateDto.status !== undefined && { status: updateDto.status }),
        ...(updateDto.type !== undefined && { type: updateDto.type }),
        ...(updateDto.content !== undefined && { content: updateDto.content }),
        ...revisionNoteUpdate,
      },
      include: {
        createdBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            category: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Log changes to audit trail
    const auditParams = {
      findingId,
      organizationId,
      userId,
      memberId,
    };

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

    // Send status change notifications (fire-and-forget)
    if (updateDto.status && updateDto.status !== previousStatus) {
      this.logger.log(
        `Status changed for finding ${findingId}: ${previousStatus} → ${updateDto.status}. Triggering notification.`,
      );

      const actorUser = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      const actorName = actorUser?.name || actorUser?.email || 'Someone';

      const notificationParams = {
        organizationId,
        findingId,
        taskId: finding.taskId,
        taskTitle: finding.task.title,
        findingContent: updatedFinding.content,
        findingType: updatedFinding.type,
        actorUserId: userId,
        actorName,
      };

      switch (updateDto.status) {
        case FindingStatus.ready_for_review:
          this.logger.log(
            `Triggering 'ready_for_review' notification for finding ${findingId}`,
          );
          void this.findingNotifierService.notifyReadyForReview({
            ...notificationParams,
            findingCreatorMemberId: finding.createdById,
          });
          break;
        case FindingStatus.needs_revision:
          this.logger.log(
            `Triggering 'needs_revision' notification for finding ${findingId}`,
          );
          void this.findingNotifierService.notifyNeedsRevision(
            notificationParams,
          );
          break;
        case FindingStatus.closed:
          this.logger.log(
            `Triggering 'closed' notification for finding ${findingId}`,
          );
          void this.findingNotifierService.notifyFindingClosed(
            notificationParams,
          );
          break;
        case FindingStatus.open:
          this.logger.log(
            `Status changed to 'open' for finding ${findingId}. No notification sent.`,
          );
          break;
        default:
          this.logger.warn(
            `Unknown status ${updateDto.status} for finding ${findingId}. No notification sent.`,
          );
      }
    } else if (updateDto.status && updateDto.status === previousStatus) {
      this.logger.log(
        `Status unchanged for finding ${findingId}: ${previousStatus}. Skipping notification.`,
      );
    }

    this.logger.log(
      `Updated finding ${findingId}: status=${updatedFinding.status}`,
    );
    return updatedFinding;
  }

  /**
   * Delete a finding (auditor or platform admin only)
   */
  async delete(
    organizationId: string,
    findingId: string,
    userId: string,
    memberId: string,
  ) {
    // Verify finding exists and get details for audit
    const finding = await this.findById(organizationId, findingId);

    await db.finding.delete({
      where: { id: findingId },
    });

    // Log to audit trail
    await this.findingAuditService.logFindingDeleted({
      findingId,
      organizationId,
      userId,
      memberId,
      taskId: finding.taskId,
      taskTitle: finding.task.title,
      content: finding.content,
    });

    this.logger.log(`Deleted finding ${findingId} from task ${finding.taskId}`);
    return {
      message: 'Finding deleted successfully',
      deletedFinding: {
        id: finding.id,
        taskId: finding.taskId,
      },
    };
  }

  /**
   * Get activity history for a finding
   */
  async getActivity(organizationId: string, findingId: string) {
    // Verify finding exists
    await this.findById(organizationId, findingId);

    return this.findingAuditService.getFindingActivity(
      findingId,
      organizationId,
    );
  }
}
