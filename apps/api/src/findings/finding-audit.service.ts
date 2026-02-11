import { Injectable, Logger } from '@nestjs/common';
import { db, FindingStatus, FindingType } from '@db/server';

export interface FindingAuditParams {
  findingId: string;
  organizationId: string;
  userId: string;
  memberId: string;
}

@Injectable()
export class FindingAuditService {
  private readonly logger = new Logger(FindingAuditService.name);

  /**
   * Log finding creation
   */
  async logFindingCreated(
    params: FindingAuditParams & {
      taskId: string;
      taskTitle: string;
      content: string;
      type: FindingType;
    },
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'finding',
          entityId: params.findingId,
          description: 'created this finding',
          data: {
            action: 'created',
            findingId: params.findingId,
            taskId: params.taskId,
            taskTitle: params.taskTitle,
            content: params.content,
            type: params.type,
            status: FindingStatus.open,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log finding creation:', error);
      // Don't throw - audit log failures should not block operations
    }
  }

  /**
   * Log finding status change
   */
  async logFindingStatusChanged(
    params: FindingAuditParams & {
      previousStatus: FindingStatus;
      newStatus: FindingStatus;
    },
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'finding',
          entityId: params.findingId,
          description: `changed status from ${this.formatStatus(params.previousStatus)} to ${this.formatStatus(params.newStatus)}`,
          data: {
            action: 'status_changed',
            findingId: params.findingId,
            previousStatus: params.previousStatus,
            newStatus: params.newStatus,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log finding status change:', error);
    }
  }

  /**
   * Log finding content update
   */
  async logFindingContentUpdated(
    params: FindingAuditParams & {
      previousContent: string;
      newContent: string;
    },
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'finding',
          entityId: params.findingId,
          description: 'updated the finding content',
          data: {
            action: 'content_updated',
            findingId: params.findingId,
            previousContent: params.previousContent,
            newContent: params.newContent,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log finding content update:', error);
    }
  }

  /**
   * Log finding type change
   */
  async logFindingTypeChanged(
    params: FindingAuditParams & {
      previousType: FindingType;
      newType: FindingType;
    },
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'finding',
          entityId: params.findingId,
          description: `changed type from ${this.formatType(params.previousType)} to ${this.formatType(params.newType)}`,
          data: {
            action: 'type_changed',
            findingId: params.findingId,
            previousType: params.previousType,
            newType: params.newType,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log finding type change:', error);
    }
  }

  /**
   * Log finding deletion
   */
  async logFindingDeleted(
    params: FindingAuditParams & {
      taskId: string;
      taskTitle: string;
      content: string;
    },
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'finding',
          entityId: params.findingId,
          description: 'deleted this finding',
          data: {
            action: 'deleted',
            findingId: params.findingId,
            taskId: params.taskId,
            taskTitle: params.taskTitle,
            content: params.content,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log finding deletion:', error);
    }
  }

  /**
   * Get activity logs for a finding
   */
  async getFindingActivity(findingId: string, organizationId: string) {
    try {
      return await db.auditLog.findMany({
        where: {
          organizationId,
          entityType: 'finding',
          entityId: findingId,
        },
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
        orderBy: {
          timestamp: 'desc', // Newest first
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch finding activity:', error);
      return [];
    }
  }

  private formatStatus(status: FindingStatus): string {
    const labels: Record<FindingStatus, string> = {
      [FindingStatus.open]: 'Open',
      [FindingStatus.ready_for_review]: 'Ready for Review',
      [FindingStatus.needs_revision]: 'Needs Revision',
      [FindingStatus.closed]: 'Closed',
    };
    return labels[status] || status;
  }

  private formatType(type: FindingType): string {
    const labels: Record<FindingType, string> = {
      [FindingType.soc2]: 'SOC 2',
      [FindingType.iso27001]: 'ISO 27001',
    };
    return labels[type] || type;
  }
}
