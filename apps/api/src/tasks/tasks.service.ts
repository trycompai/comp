import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { db, TaskStatus, Prisma } from '@trycompai/db';
import { TaskResponseDto } from './dto/task-responses.dto';
import { TaskNotifierService } from './task-notifier.service';

@Injectable()
export class TasksService {
  constructor(private readonly taskNotifierService: TaskNotifierService) {}

  /**
   * Get all tasks for an organization
   * @param organizationId - The organization ID
   * @param assignmentFilter - Optional filter for assignment-based access (for employee/contractor roles)
   */
  async getTasks(
    organizationId: string,
    assignmentFilter: Prisma.TaskWhereInput = {},
  ): Promise<TaskResponseDto[]> {
    try {
      const tasks = await db.task.findMany({
        where: {
          organizationId,
          ...assignmentFilter,
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
        frequency?: string;
        department?: string;
        reviewDate?: Date | null;
      } = {};

      if (updateData.status !== undefined) {
        dataToUpdate.status = updateData.status;
      }
      if (updateData.assigneeId !== undefined) {
        // Convert null to undefined for Prisma, or keep string value
        dataToUpdate.assigneeId =
          updateData.assigneeId === null ? null : updateData.assigneeId;
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

      // Send notifications for status changes
      if (
        updateData.status !== undefined &&
        existingTask.status !== updateData.status
      ) {
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

      // Send notifications for assignee changes
      if (
        updateData.assigneeId !== undefined &&
        (existingTask.assigneeId ?? null) !== (updateData.assigneeId ?? null)
      ) {
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
}
