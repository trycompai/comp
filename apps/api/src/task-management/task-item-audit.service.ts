import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';

@Injectable()
export class TaskItemAuditService {
  private readonly logger = new Logger(TaskItemAuditService.name);

  /**
   * Log task item creation
   */
  async logTaskItemCreated(params: {
    taskItemId: string;
    organizationId: string;
    userId: string;
    memberId: string;
    taskTitle: string;
    entityType: string;
    entityId: string;
  }): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'task',
          entityId: params.taskItemId,
          description: 'created this task',
          data: {
            action: 'created',
            taskItemId: params.taskItemId,
            taskTitle: params.taskTitle,
            parentEntityType: params.entityType,
            parentEntityId: params.entityId,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log task item creation:', error);
      // Don't throw - audit log failures should not block operations
    }
  }

  /**
   * Log task item update
   */
  async logTaskItemUpdated(params: {
    taskItemId: string;
    organizationId: string;
    userId: string;
    memberId: string;
    taskTitle: string;
    changes: string[];
    entityType: string;
    entityId: string;
  }): Promise<void> {
    try {
      const changeDescription = params.changes.length > 0 
        ? params.changes.join(', ')
        : 'updated the task';

      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'task',
          entityId: params.taskItemId,
          description: changeDescription,
          data: {
            action: 'updated',
            taskItemId: params.taskItemId,
            taskTitle: params.taskTitle,
            changes: params.changes,
            parentEntityType: params.entityType,
            parentEntityId: params.entityId,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log task item update:', error);
      // Don't throw - audit log failures should not block operations
    }
  }

  /**
   * Log task item assignment
   */
  async logTaskItemAssigned(params: {
    taskItemId: string;
    organizationId: string;
    userId: string;
    memberId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeName: string;
    entityType: string;
    entityId: string;
  }): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          memberId: params.memberId,
          entityType: 'task',
          entityId: params.taskItemId,
          description: `assigned this to ${params.assigneeName}`,
          data: {
            action: 'assigned',
            taskItemId: params.taskItemId,
            taskTitle: params.taskTitle,
            assigneeId: params.assigneeId,
            assigneeName: params.assigneeName,
            parentEntityType: params.entityType,
            parentEntityId: params.entityId,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log task item assignment:', error);
      // Don't throw - audit log failures should not block operations
    }
  }

  /**
   * Get activity logs for a task item
   */
  async getTaskItemActivity(taskItemId: string, organizationId: string) {
    try {
      return await db.auditLog.findMany({
        where: {
          organizationId,
          entityType: 'task',
          entityId: taskItemId,
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
          timestamp: 'asc', // Oldest first, newest last
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch task item activity:', error);
      return [];
    }
  }
}

