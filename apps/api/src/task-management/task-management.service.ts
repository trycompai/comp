import { db } from '@db';
import { TaskItemEntityType, TaskItemStatus, TaskItemPriority } from '@db';
import { isMemberOrgParticipant } from '../utils/org-participation';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CreateTaskItemDto } from './dto/create-task-item.dto';
import type { UpdateTaskItemDto } from './dto/update-task-item.dto';
import type { AuthContext as AuthContextType } from '../auth/types';
import { TaskItemResponseDto } from './dto/task-item-response.dto';
import {
  PaginatedTaskItemResponseDto,
  PaginationMetaDto,
} from './dto/paginated-task-item-response.dto';
import type { GetTaskItemQueryDto } from './dto/get-task-item-query.dto';
import { TaskItemAssignmentNotifierService } from './task-item-assignment-notifier.service';
import { TaskItemMentionNotifierService } from './task-item-mention-notifier.service';
import { TaskItemAuditService } from './task-item-audit.service';
import { extractMentionedUserIds } from './utils/extract-mentions';

@Injectable()
export class TaskManagementService {
  private readonly logger = new Logger(TaskManagementService.name);
  constructor(
    private readonly notifier: TaskItemAssignmentNotifierService,
    private readonly mentionNotifier: TaskItemMentionNotifierService,
    private readonly taskItemAudit: TaskItemAuditService,
  ) {}

  /**
   * Resolve the member to attribute a task-item mutation to. Session callers use
   * their own membership. API-key callers have no user, so fall back to an
   * active org owner (then admin) — the operation is still attributed to a real
   * member for the FK, and the audit log records that it was done via API key.
   */
  private async resolveActorMember(
    organizationId: string,
    authContext: AuthContextType,
  ): Promise<{ memberId: string; userId: string; viaApiKey: boolean }> {
    if (authContext.isApiKey) {
      for (const roleNeedle of ['owner', 'admin']) {
        const member = await db.member.findFirst({
          where: {
            organizationId,
            isActive: true,
            deactivated: false,
            role: { contains: roleNeedle },
          },
          select: { id: true, userId: true },
          orderBy: { createdAt: 'asc' },
        });
        if (member?.userId) {
          return {
            memberId: member.id,
            userId: member.userId,
            viaApiKey: true,
          };
        }
      }
      throw new BadRequestException(
        'Cannot determine an actor: the organization has no active owner or admin to attribute this action to.',
      );
    }

    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }
    const member = await db.member.findFirst({
      where: {
        userId: authContext.userId,
        organizationId,
        deactivated: false,
      },
      select: { id: true, userId: true },
    });
    if (!member) {
      throw new BadRequestException(
        'User is not a member of this organization',
      );
    }
    return {
      memberId: member.id,
      userId: member.userId ?? authContext.userId,
      viaApiKey: false,
    };
  }

  /**
   * Get task items overview/stats for an entity
   */
  async getTaskItemsStats(
    organizationId: string,
    entityId: string,
    entityType: TaskItemEntityType,
  ): Promise<{
    total: number;
    byStatus: Record<TaskItemStatus, number>;
  }> {
    try {
      // Defensive guard: avoid returning org-wide stats if an endpoint is called without entity context.
      // Validation should catch this first, but this ensures safety even if validation is misconfigured.
      if (!entityId || !entityType) {
        throw new BadRequestException('entityId and entityType are required');
      }

      const [total, statusCounts] = await Promise.all([
        db.taskItem.count({
          where: {
            organizationId,
            entityId,
            entityType,
          },
        }),
        db.taskItem.groupBy({
          by: ['status'],
          where: {
            organizationId,
            entityId,
            entityType,
          },
          _count: true,
        }),
      ]);

      const byStatus: Record<TaskItemStatus, number> = {
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
        canceled: 0,
      };

      statusCounts.forEach((item) => {
        byStatus[item.status] = item._count;
      });

      return { total, byStatus };
    } catch (error) {
      this.logger.error('Error fetching task items stats:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch task items stats',
      );
    }
  }

  /**
   * Get all task items for an entity with pagination, filtering, and sorting
   */
  async getTaskItems(
    organizationId: string,
    query: GetTaskItemQueryDto,
  ): Promise<PaginatedTaskItemResponseDto> {
    try {
      const {
        entityId,
        entityType,
        page = 1,
        limit = 5,
        status,
        priority,
        assigneeId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        organizationId,
        entityId,
        entityType,
      };

      if (status) {
        where.status = status;
      }

      if (priority) {
        where.priority = priority;
      }

      if (assigneeId) {
        if (assigneeId === '__unassigned__') {
          where.assigneeId = null;
        } else {
          where.assigneeId = assigneeId;
        }
      }

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [taskItems, total] = await Promise.all([
        db.taskItem.findMany({
          where,
          include: {
            assignee: {
              include: {
                user: true,
              },
            },
            createdBy: {
              include: {
                user: true,
              },
            },
            updatedBy: {
              include: {
                user: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.taskItem.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      const data: TaskItemResponseDto[] = taskItems.map((taskItem) => ({
        id: taskItem.id,
        title: taskItem.title,
        description: taskItem.description,
        status: taskItem.status,
        priority: taskItem.priority,
        entityId: taskItem.entityId,
        entityType: taskItem.entityType,
        assignee: taskItem.assignee
          ? {
              id: taskItem.assignee.id,
              user: {
                id: taskItem.assignee.user.id,
                name: taskItem.assignee.user.name,
                email: taskItem.assignee.user.email,
                image: taskItem.assignee.user.image,
              },
            }
          : null,
        createdBy: {
          id: taskItem.createdBy.id,
          user: {
            id: taskItem.createdBy.user.id,
            name: taskItem.createdBy.user.name,
            email: taskItem.createdBy.user.email,
            image: taskItem.createdBy.user.image,
          },
        },
        updatedBy: taskItem.updatedBy
          ? {
              id: taskItem.updatedBy.id,
              user: {
                id: taskItem.updatedBy.user.id,
                name: taskItem.updatedBy.user.name,
                email: taskItem.updatedBy.user.email,
                image: taskItem.updatedBy.user.image,
              },
            }
          : null,
        createdAt: taskItem.createdAt,
        updatedAt: taskItem.updatedAt,
      }));

      const meta: PaginationMetaDto = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return {
        data,
        meta,
      };
    } catch (error) {
      this.logger.error('Error fetching task items:', error);
      throw new InternalServerErrorException('Failed to fetch task items');
    }
  }

  /**
   * Create a new task item
   */
  async createTaskItem(
    organizationId: string,
    authContext: AuthContextType,
    createTaskItemDto: CreateTaskItemDto,
  ): Promise<TaskItemResponseDto> {
    try {
      // Resolve the actor: session user, or an org owner fallback for API keys.
      const actor = await this.resolveActorMember(organizationId, authContext);

      if (createTaskItemDto.assigneeId) {
        const assigneeMember = await db.member.findFirst({
          where: { id: createTaskItemDto.assigneeId, organizationId },
          include: { user: { select: { role: true } } },
        });
        if (!assigneeMember) {
          throw new BadRequestException(
            'Assignee is not a member of this organization',
          );
        }
        if (
          !(await isMemberOrgParticipant(
            assigneeMember.user.role,
            organizationId,
          ))
        ) {
          throw new BadRequestException(
            'Cannot assign a platform admin as assignee',
          );
        }
      }

      const taskItem = await db.taskItem.create({
        data: {
          ...createTaskItemDto,
          organizationId,
          ...(createTaskItemDto.assigneeId && {
            assigneeId: createTaskItemDto.assigneeId,
          }),
          createdById: actor.memberId,
        },
        include: {
          assignee: {
            include: {
              user: true,
            },
          },
          createdBy: {
            include: {
              user: true,
            },
          },
          updatedBy: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(
        `Created task item: ${taskItem.id} for organization ${organizationId} by ${actor.memberId}`,
      );

      // API-key actions are skipped by the global audit interceptor (no user),
      // so record an explicit, truthful "via API key" entry. Session auth keeps
      // using the interceptor — no double logging.
      if (actor.viaApiKey) {
        await this.taskItemAudit.logTaskItemCreated({
          taskItemId: taskItem.id,
          organizationId,
          userId: actor.userId,
          memberId: actor.memberId,
          taskTitle: taskItem.title,
          entityType: taskItem.entityType,
          entityId: taskItem.entityId,
          viaApiKey: true,
        });
      }

      if (createTaskItemDto.assigneeId && authContext.userId) {
        this.logger.log(
          `[ASSIGNEE DEBUG] Sending assignment notification to ${createTaskItemDto.assigneeId} for task ${taskItem.id}`,
        );

        // Fire-and-forget: notification failures should not block task creation
        void this.notifier.notifyAssignee({
          organizationId,
          taskItemId: taskItem.id,
          entityType: taskItem.entityType as any,
          entityId: taskItem.entityId,
          taskTitle: taskItem.title,
          assigneeMemberId: createTaskItemDto.assigneeId,
          assignedByUserId: authContext.userId,
        });
      }

      // Notify mentioned users
      if (createTaskItemDto.description && authContext.userId) {
        const mentionedUserIds = extractMentionedUserIds(
          createTaskItemDto.description,
        );
        this.logger.log(
          `[MENTION DEBUG] Extracted ${mentionedUserIds.length} mentioned users: ${JSON.stringify(mentionedUserIds)}`,
        );
        if (mentionedUserIds.length > 0) {
          this.logger.log(
            `[MENTION DEBUG] Calling mention notifier for task ${taskItem.id}`,
          );
          // Fire-and-forget: notification failures should not block task creation
          void this.mentionNotifier.notifyMentionedUsers({
            organizationId,
            taskItemId: taskItem.id,
            taskTitle: taskItem.title,
            entityType: taskItem.entityType,
            entityId: taskItem.entityId,
            mentionedUserIds,
            mentionedByUserId: authContext.userId,
          });
        } else {
          this.logger.log(`[MENTION DEBUG] No mentions found in description`);
        }
      }

      return {
        id: taskItem.id,
        title: taskItem.title,
        description: taskItem.description,
        status: taskItem.status,
        priority: taskItem.priority,
        entityId: taskItem.entityId,
        entityType: taskItem.entityType,
        assignee: taskItem.assignee
          ? {
              id: taskItem.assignee.id,
              user: {
                id: taskItem.assignee.user.id,
                name: taskItem.assignee.user.name,
                email: taskItem.assignee.user.email,
                image: taskItem.assignee.user.image,
              },
            }
          : null,
        createdBy: {
          id: taskItem.createdBy.id,
          user: {
            id: taskItem.createdBy.user.id,
            name: taskItem.createdBy.user.name,
            email: taskItem.createdBy.user.email,
            image: taskItem.createdBy.user.image,
          },
        },
        updatedBy: taskItem.updatedBy
          ? {
              id: taskItem.updatedBy.id,
              user: {
                id: taskItem.updatedBy.user.id,
                name: taskItem.updatedBy.user.name,
                email: taskItem.updatedBy.user.email,
                image: taskItem.updatedBy.user.image,
              },
            }
          : null,
        createdAt: taskItem.createdAt,
        updatedAt: taskItem.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error creating task item:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create task item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a task item
   */
  async updateTaskItem(
    taskItemId: string,
    organizationId: string,
    authContext: AuthContextType,
    updateTaskItemDto: UpdateTaskItemDto,
  ): Promise<TaskItemResponseDto> {
    try {
      // Resolve the actor: session user, or an org owner fallback for API keys.
      const actor = await this.resolveActorMember(organizationId, authContext);

      // Verify task item exists and belongs to organization
      const existingTaskItem = await db.taskItem.findFirst({
        where: {
          id: taskItemId,
          organizationId,
        },
      });

      if (!existingTaskItem) {
        throw new NotFoundException('Task item not found');
      }

      // Prepare update data
      const updateData: {
        title?: string;
        description?: string | null;
        status?: TaskItemStatus;
        priority?: TaskItemPriority;
        assigneeId?: string | null;
        updatedById: string;
      } = {
        updatedById: actor.memberId,
      };

      if (updateTaskItemDto.title !== undefined) {
        updateData.title = updateTaskItemDto.title;
      }
      if (updateTaskItemDto.description !== undefined) {
        updateData.description = updateTaskItemDto.description || null;
      }
      if (updateTaskItemDto.status !== undefined) {
        updateData.status = updateTaskItemDto.status;
      }
      if (updateTaskItemDto.priority !== undefined) {
        updateData.priority = updateTaskItemDto.priority;
      }
      if (updateTaskItemDto.assigneeId !== undefined) {
        if (updateTaskItemDto.assigneeId) {
          const assigneeMember = await db.member.findFirst({
            where: { id: updateTaskItemDto.assigneeId, organizationId },
            include: { user: { select: { role: true } } },
          });
          if (!assigneeMember) {
            throw new BadRequestException(
              'Assignee is not a member of this organization',
            );
          }
          if (
            !(await isMemberOrgParticipant(
              assigneeMember.user.role,
              organizationId,
            ))
          ) {
            throw new BadRequestException(
              'Cannot assign a platform admin as assignee',
            );
          }
        }
        updateData.assigneeId = updateTaskItemDto.assigneeId;
      }

      const taskItem = await db.taskItem.update({
        where: { id: taskItemId },
        data: updateData,
        include: {
          assignee: {
            include: {
              user: true,
            },
          },
          createdBy: {
            include: {
              user: true,
            },
          },
          updatedBy: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(`Updated task item: ${taskItem.id} by ${actor.memberId}`);

      // API-key actions are skipped by the global audit interceptor (no user),
      // so record an explicit, truthful "via API key" entry. Session auth keeps
      // using the interceptor — no double logging.
      if (actor.viaApiKey) {
        const changes: string[] = [];
        if (updateTaskItemDto.status !== undefined) {
          changes.push(`set status to ${updateTaskItemDto.status}`);
        }
        if (updateTaskItemDto.priority !== undefined) {
          changes.push(`set priority to ${updateTaskItemDto.priority}`);
        }
        if (updateTaskItemDto.title !== undefined) {
          changes.push('updated the title');
        }
        if (updateTaskItemDto.description !== undefined) {
          changes.push('updated the description');
        }
        if (updateTaskItemDto.assigneeId !== undefined) {
          changes.push('changed the assignee');
        }
        await this.taskItemAudit.logTaskItemUpdated({
          taskItemId: taskItem.id,
          organizationId,
          userId: actor.userId,
          memberId: actor.memberId,
          taskTitle: taskItem.title,
          changes,
          entityType: taskItem.entityType,
          entityId: taskItem.entityId,
          viaApiKey: true,
        });
      }

      // Notify assignee only when assignee changes
      const assigneeChanged =
        updateTaskItemDto.assigneeId !== undefined &&
        (existingTaskItem.assigneeId ?? null) !== (taskItem.assigneeId ?? null);

      if (assigneeChanged && authContext.userId) {
        if (taskItem.assigneeId) {
          // Assigned to someone
          this.logger.log(
            `[ASSIGNEE DEBUG] Assignee changed to ${taskItem.assigneeId}, sending notification for task ${taskItem.id}`,
          );

          void this.notifier.notifyAssignee({
            organizationId,
            taskItemId: taskItem.id,
            entityType: taskItem.entityType as any,
            entityId: taskItem.entityId,
            taskTitle: taskItem.title,
            assigneeMemberId: taskItem.assigneeId,
            assignedByUserId: authContext.userId,
          });
        } else {
          // Assignee removed
          this.logger.log(
            `[ASSIGNEE DEBUG] Assignee removed from task ${taskItem.id}`,
          );
        }
      } else if (updateTaskItemDto.assigneeId !== undefined) {
        this.logger.log(
          `[ASSIGNEE DEBUG] Assignee did not change, skipping notification`,
        );
      }

      // Notify mentioned users every time (no time restrictions)
      if (updateTaskItemDto.description !== undefined && authContext.userId) {
        const mentionedUserIds = extractMentionedUserIds(taskItem.description);

        this.logger.log(
          `[MENTION DEBUG] Sending notifications to ${mentionedUserIds.length} mentioned users`,
        );

        if (mentionedUserIds.length > 0) {
          // Fire-and-forget: notification failures should not block task update
          void this.mentionNotifier.notifyMentionedUsers({
            organizationId,
            taskItemId: taskItem.id,
            taskTitle: taskItem.title,
            entityType: taskItem.entityType,
            entityId: taskItem.entityId,
            mentionedUserIds,
            mentionedByUserId: authContext.userId,
          });
        } else {
          this.logger.log(`[MENTION DEBUG] No mentions found in description`);
        }
      }

      return {
        id: taskItem.id,
        title: taskItem.title,
        description: taskItem.description,
        status: taskItem.status,
        priority: taskItem.priority,
        entityId: taskItem.entityId,
        entityType: taskItem.entityType,
        assignee: taskItem.assignee
          ? {
              id: taskItem.assignee.id,
              user: {
                id: taskItem.assignee.user.id,
                name: taskItem.assignee.user.name,
                email: taskItem.assignee.user.email,
                image: taskItem.assignee.user.image,
              },
            }
          : null,
        createdBy: {
          id: taskItem.createdBy.id,
          user: {
            id: taskItem.createdBy.user.id,
            name: taskItem.createdBy.user.name,
            email: taskItem.createdBy.user.email,
            image: taskItem.createdBy.user.image,
          },
        },
        updatedBy: taskItem.updatedBy
          ? {
              id: taskItem.updatedBy.id,
              user: {
                id: taskItem.updatedBy.user.id,
                name: taskItem.updatedBy.user.name,
                email: taskItem.updatedBy.user.email,
                image: taskItem.updatedBy.user.image,
              },
            }
          : null,
        createdAt: taskItem.createdAt,
        updatedAt: taskItem.updatedAt,
      };
    } catch (error) {
      this.logger.error('Error updating task item:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update task item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a task item
   */
  async deleteTaskItem(
    taskItemId: string,
    organizationId: string,
    authContext: AuthContextType,
  ): Promise<void> {
    try {
      // Verify task item exists and belongs to organization
      const existingTaskItem = await db.taskItem.findFirst({
        where: {
          id: taskItemId,
          organizationId,
        },
      });

      if (!existingTaskItem) {
        throw new NotFoundException('Task item not found');
      }

      // For API keys, resolve the audit actor (org owner fallback) before
      // deleting so a missing actor fails cleanly without removing the item.
      const apiKeyActor = authContext.isApiKey
        ? await this.resolveActorMember(organizationId, authContext)
        : null;

      await db.taskItem.delete({
        where: { id: taskItemId },
      });

      this.logger.log(`Deleted task item: ${taskItemId}`);

      // API-key actions are skipped by the global audit interceptor (no user),
      // so record an explicit, truthful "via API key" entry.
      if (apiKeyActor) {
        await this.taskItemAudit.logTaskItemDeleted({
          taskItemId,
          organizationId,
          userId: apiKeyActor.userId,
          memberId: apiKeyActor.memberId,
          taskTitle: existingTaskItem.title,
          entityType: existingTaskItem.entityType,
          entityId: existingTaskItem.entityId,
          viaApiKey: true,
        });
      }
    } catch (error) {
      this.logger.error('Error deleting task item:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to delete task item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
