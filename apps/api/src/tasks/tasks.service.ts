import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { db, TaskStatus } from '@trycompai/db/server';
import { TaskResponseDto } from './dto/task-responses.dto';
import { TaskNotifierService } from './task-notifier.service';

@Injectable()
export class TasksService {
  constructor(private readonly taskNotifierService: TaskNotifierService) {}

  /**
   * Get all tasks for an organization
   */
  async getTasks(organizationId: string): Promise<TaskResponseDto[]> {
    try {
      const tasks = await db.task.findMany({
        where: {
          organizationId,
        },
        orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      });

      return tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        taskTemplateId: task.taskTemplateId,
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new InternalServerErrorException('Failed to fetch tasks');
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(
    organizationId: string,
    taskId: string,
  ): Promise<TaskResponseDto> {
    try {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          organizationId,
        },
        include: {
          assignee: true,
          approver: { include: { user: true } },
        },
      });

      if (!task) {
        throw new BadRequestException('Task not found or access denied');
      }

      return task;
    } catch (error) {
      console.error('Error fetching task:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch task');
    }
  }

  /**
   * Verify that a task exists and user has access
   */
  async verifyTaskAccess(
    organizationId: string,
    taskId: string,
  ): Promise<void> {
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
    });

    if (!task) {
      throw new BadRequestException('Task not found or access denied');
    }
  }

  /**
   * Get audit activity for a task
   */
  async getTaskActivity(
    organizationId: string,
    taskId: string,
    skip = 0,
    take = 10,
  ) {
    await this.verifyTaskAccess(organizationId, taskId);

    const where = {
      organizationId,
      entityType: 'task' as const,
      entityId: taskId,
    };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get all automation runs for a task
   */
  async getTaskAutomationRuns(organizationId: string, taskId: string) {
    // Verify task access
    await this.verifyTaskAccess(organizationId, taskId);

    const runs = await db.evidenceAutomationRun.findMany({
      where: {
        taskId,
      },
      include: {
        evidenceAutomation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return runs;
  }

  /**
   * Update status for multiple tasks
   */
  async updateTasksStatus(
    organizationId: string,
    taskIds: string[],
    status: TaskStatus,
    reviewDate: Date | undefined,
    changedByUserId: string,
  ): Promise<{ updatedCount: number }> {
    try {
      const result = await db.task.updateMany({
        where: {
          id: {
            in: taskIds,
          },
          organizationId,
        },
        data: {
          status,
          updatedAt: new Date(),
          ...(reviewDate !== undefined ? { reviewDate } : {}),
        },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          'No tasks were updated. Check task IDs or organization access.',
        );
      }

      // Send notifications (fire-and-forget, don't block response)
      this.taskNotifierService
        .notifyBulkStatusChange({
          organizationId,
          taskIds,
          newStatus: status,
          changedByUserId,
        })
        .catch((error) => {
          console.error(
            'Failed to send bulk status change notifications:',
            error,
          );
        });

      return { updatedCount: result.count };
    } catch (error) {
      console.error('Error updating task statuses:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update task statuses');
    }
  }

  /**
   * Update assignee for multiple tasks
   */
  async updateTasksAssignee(
    organizationId: string,
    taskIds: string[],
    assigneeId: string | null,
    changedByUserId: string,
  ): Promise<{ updatedCount: number }> {
    try {
      const result = await db.task.updateMany({
        where: {
          id: {
            in: taskIds,
          },
          organizationId,
        },
        data: {
          assigneeId,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          'No tasks were updated. Check task IDs or organization access.',
        );
      }

      // Send notifications (fire-and-forget, don't block response)
      this.taskNotifierService
        .notifyBulkAssigneeChange({
          organizationId,
          taskIds,
          newAssigneeId: assigneeId,
          changedByUserId,
        })
        .catch((error) => {
          console.error(
            'Failed to send bulk assignee change notifications:',
            error,
          );
        });

      return { updatedCount: result.count };
    } catch (error) {
      console.error('Error updating task assignees:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update task assignees');
    }
  }

  /**
   * Delete multiple tasks
   */
  async deleteTasks(
    organizationId: string,
    taskIds: string[],
  ): Promise<{ deletedCount: number }> {
    try {
      const result = await db.task.deleteMany({
        where: {
          id: {
            in: taskIds,
          },
          organizationId,
        },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          'No tasks were deleted. Check task IDs or organization access.',
        );
      }

      return { deletedCount: result.count };
    } catch (error) {
      console.error('Error deleting tasks:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete tasks');
    }
  }

  /**
   * Update a single task
   */
  async updateTask(
    organizationId: string,
    taskId: string,
    updateData: {
      status?: TaskStatus;
      assigneeId?: string | null;
      approverId?: string | null;
      frequency?: string;
      department?: string;
      reviewDate?: Date | null;
    },
    changedByUserId: string,
  ): Promise<TaskResponseDto> {
    try {
      // Get existing task to track changes
      const existingTask = await db.task.findFirst({
        where: {
          id: taskId,
          organizationId,
        },
        select: {
          id: true,
          title: true,
          status: true,
          assigneeId: true,
        },
      });

      if (!existingTask) {
        throw new BadRequestException('Task not found or access denied');
      }

      // Prepare update data - Prisma handles updatedAt automatically
      const dataToUpdate: {
        status?: TaskStatus;
        assigneeId?: string | null;
        approverId?: string | null;
        frequency?: string;
        department?: string;
        reviewDate?: Date | null;
      } = {};

      if (updateData.status !== undefined) {
        dataToUpdate.status = updateData.status;
      }
      if (updateData.assigneeId !== undefined) {
        dataToUpdate.assigneeId =
          updateData.assigneeId === null ? null : updateData.assigneeId;
      }
      if (updateData.approverId !== undefined) {
        dataToUpdate.approverId =
          updateData.approverId === null ? null : updateData.approverId;
      }
      if (updateData.frequency !== undefined) {
        dataToUpdate.frequency = updateData.frequency;
      }
      if (updateData.department !== undefined) {
        dataToUpdate.department = updateData.department;
      }
      if (updateData.reviewDate !== undefined) {
        dataToUpdate.reviewDate = updateData.reviewDate;
      }

      // Get the current member for audit logging
      const currentMember = await db.member.findFirst({
        where: { userId: changedByUserId, organizationId, deactivated: false },
      });

      // Update the task
      const updatedTask = await db.task.update({
        where: {
          id: taskId,
          organizationId,
        },
        data: dataToUpdate as any, // Type assertion needed due to Prisma's strict typing
        include: {
          assignee: true,
        },
      });

      // Write audit logs and send notifications for status changes
      if (
        updateData.status !== undefined &&
        existingTask.status !== updateData.status
      ) {
        const oldStatusLabel = existingTask.status.replace('_', ' ');
        const newStatusLabel = updateData.status.replace('_', ' ');

        await db.auditLog.create({
          data: {
            organizationId,
            userId: changedByUserId,
            memberId: currentMember?.id ?? null,
            entityType: 'task',
            entityId: taskId,
            description: `changed status from ${oldStatusLabel} to ${newStatusLabel}`,
            data: {
              action: 'update',
              taskTitle: existingTask.title,
              field: 'status',
              oldValue: existingTask.status,
              newValue: updateData.status,
            },
          },
        });

        this.taskNotifierService
          .notifyStatusChange({
            organizationId,
            taskId,
            taskTitle: existingTask.title,
            oldStatus: existingTask.status,
            newStatus: updateData.status,
            changedByUserId,
          })
          .catch((error) => {
            console.error('Failed to send status change notifications:', error);
          });
      }

      // Write audit logs and send notifications for assignee changes
      if (
        updateData.assigneeId !== undefined &&
        (existingTask.assigneeId ?? null) !== (updateData.assigneeId ?? null)
      ) {
        // Resolve assignee names for the audit log
        const [oldAssignee, newAssignee] = await Promise.all([
          existingTask.assigneeId
            ? db.member.findUnique({
                where: { id: existingTask.assigneeId },
                include: { user: { select: { name: true, email: true } } },
              })
            : null,
          updateData.assigneeId
            ? db.member.findUnique({
                where: { id: updateData.assigneeId },
                include: { user: { select: { name: true, email: true } } },
              })
            : null,
        ]);

        const oldName = oldAssignee
          ? oldAssignee.user.name || oldAssignee.user.email
          : 'unassigned';
        const newName = newAssignee
          ? newAssignee.user.name || newAssignee.user.email
          : 'unassigned';

        await db.auditLog.create({
          data: {
            organizationId,
            userId: changedByUserId,
            memberId: currentMember?.id ?? null,
            entityType: 'task',
            entityId: taskId,
            description: `changed assignee from ${oldName} to ${newName}`,
            data: {
              action: 'update',
              taskTitle: existingTask.title,
              field: 'assignee',
              oldValue: existingTask.assigneeId,
              newValue: updateData.assigneeId,
            },
          },
        });

        this.taskNotifierService
          .notifyAssigneeChange({
            organizationId,
            taskId,
            taskTitle: existingTask.title,
            oldAssigneeId: existingTask.assigneeId,
            newAssigneeId: updateData.assigneeId,
            changedByUserId,
          })
          .catch((error) => {
            console.error(
              'Failed to send assignee change notifications:',
              error,
            );
          });
      }

      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  /**
   * Submit a task for review (moves status to in_review)
   */
  async submitForReview(
    organizationId: string,
    taskId: string,
    userId: string,
    approverId: string,
  ): Promise<TaskResponseDto> {
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new BadRequestException('Task not found or access denied');
    }

    if (task.status === 'in_review') {
      throw new BadRequestException('Task is already in review');
    }

    if (task.status === 'done') {
      throw new BadRequestException('Task is already done');
    }

    // Verify the approver exists and is active
    const approver = await db.member.findFirst({
      where: { id: approverId, organizationId, deactivated: false },
      include: { user: true },
    });

    if (!approver) {
      throw new BadRequestException('Approver not found or is deactivated');
    }

    const currentMember = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
    });

    const updatedTask = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId, organizationId },
        data: {
          status: TaskStatus.in_review,
          previousStatus: task.status,
          approverId,
        },
        include: { assignee: true, approver: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          memberId: currentMember?.id ?? null,
          entityType: 'task',
          entityId: taskId,
          description: `submitted evidence for review by ${approver.user.name || approver.user.email}`,
          data: {
            action: 'review',
            taskTitle: task.title,
            approverId,
            previousStatus: task.status,
          },
        },
      });

      return updated;
    });

    // Notify approver (fire-and-forget)
    this.taskNotifierService
      .notifyEvidenceReviewRequested({
        organizationId,
        taskId,
        taskTitle: task.title,
        submittedByUserId: userId,
        approverMemberId: approverId,
      })
      .catch((error) => {
        console.error('Failed to send evidence review request notifications:', error);
      });

    return updatedTask;
  }

  /**
   * Bulk submit tasks for review
   */
  async bulkSubmitForReview(
    organizationId: string,
    taskIds: string[],
    userId: string,
    approverId: string,
  ): Promise<{ submittedCount: number }> {
    // Verify the approver exists and is active
    const approver = await db.member.findFirst({
      where: { id: approverId, organizationId, deactivated: false },
      include: { user: true },
    });

    if (!approver) {
      throw new BadRequestException('Approver not found or is deactivated');
    }

    const tasks = await db.task.findMany({
      where: {
        id: { in: taskIds },
        organizationId,
        status: { notIn: ['in_review', 'done'] },
      },
    });

    if (tasks.length === 0) {
      throw new BadRequestException('No eligible tasks found for review');
    }

    const currentMember = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
    });

    await db.$transaction(async (tx) => {
      for (const task of tasks) {
        await tx.task.update({
          where: { id: task.id, organizationId },
          data: {
            status: TaskStatus.in_review,
            previousStatus: task.status,
            approverId,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId,
            userId,
            memberId: currentMember?.id ?? null,
            entityType: 'task',
            entityId: task.id,
            description: `submitted evidence for review by ${approver.user.name || approver.user.email}`,
            data: {
              action: 'review',
              taskTitle: task.title,
              approverId,
              previousStatus: task.status,
            },
          },
        });
      }
    });

    // Send a single notification for all tasks (fire-and-forget)
    this.taskNotifierService
      .notifyBulkEvidenceReviewRequested({
        organizationId,
        taskIds: tasks.map((t) => t.id),
        taskCount: tasks.length,
        submittedByUserId: userId,
        approverMemberId: approverId,
      })
      .catch((error) => {
        console.error('Failed to send bulk evidence review request notifications:', error);
      });

    return { submittedCount: tasks.length };
  }

  /**
   * Approve a task (moves status from in_review to done)
   */
  async approveTask(
    organizationId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskResponseDto> {
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
      include: {
        approver: { include: { user: true } },
        assignee: { include: { user: true } },
      },
    });

    if (!task) {
      throw new BadRequestException('Task not found or access denied');
    }

    if (task.status !== 'in_review') {
      throw new BadRequestException('Task must be in review to approve');
    }

    // Verify the current user is the assigned approver
    const currentMember = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      include: { user: true },
    });

    if (!currentMember) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (task.approverId !== currentMember.id) {
      throw new ForbiddenException(
        'Only the assigned approver can approve this task',
      );
    }

    const now = new Date();

    const updatedTask = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId, organizationId },
        data: {
          status: TaskStatus.done,
          approvedAt: now,
          reviewDate: now,
          previousStatus: null,
        },
        include: { assignee: true, approver: true },
      });

      const assigneeName = task.assignee
        ? task.assignee.user.name || task.assignee.user.email
        : 'Unknown';

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          memberId: currentMember.id,
          entityType: 'task',
          entityId: taskId,
          description: `approved evidence by ${assigneeName}`,
          data: {
            action: 'approve',
            taskTitle: task.title,
            assigneeName,
          },
        },
      });

      return updated;
    });

    return updatedTask;
  }

  /**
   * Reject a task (reverts status from in_review to previousStatus)
   */
  async rejectTask(
    organizationId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskResponseDto> {
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
      include: {
        approver: { include: { user: true } },
        assignee: { include: { user: true } },
      },
    });

    if (!task) {
      throw new BadRequestException('Task not found or access denied');
    }

    if (task.status !== 'in_review') {
      throw new BadRequestException('Task must be in review to reject');
    }

    // Verify the current user is the assigned approver or an admin/owner
    const currentMember = await db.member.findFirst({
      where: { userId, organizationId, deactivated: false },
      include: { user: true },
    });

    if (!currentMember) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    const memberRoles = currentMember.role
      ?.split(',')
      .map((r: string) => r.trim()) ?? [];
    const isAdminOrOwner =
      memberRoles.includes('admin') || memberRoles.includes('owner');
    const isApprover = task.approverId === currentMember.id;

    if (!isApprover && !isAdminOrOwner) {
      throw new ForbiddenException(
        'Only the assigned approver or an admin/owner can reject this task',
      );
    }

    const isCancellation = !isApprover && isAdminOrOwner;
    const revertStatus = task.previousStatus ?? TaskStatus.todo;

    const updatedTask = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId, organizationId },
        data: {
          status: revertStatus,
          previousStatus: null,
          approverId: null,
          approvedAt: null,
        },
        include: { assignee: true, approver: true },
      });

      const assigneeName = task.assignee
        ? (task.assignee.user.name || task.assignee.user.email)
        : 'Unknown';

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          memberId: currentMember.id,
          entityType: 'task',
          entityId: taskId,
          description: isCancellation
            ? `cancelled evidence review for ${assigneeName}`
            : `rejected evidence by ${assigneeName}`,
          data: {
            action: isCancellation ? 'reject' : 'reject',
            taskTitle: task.title,
            revertedToStatus: revertStatus,
          },
        },
      });

      return updated;
    });

    return updatedTask;
  }
}
