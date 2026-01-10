import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { db, TaskStatus } from '@trycompai/db';
import { TaskResponseDto } from './dto/task-responses.dto';

@Injectable()
export class TasksService {
  constructor() {}

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
    reviewDate?: Date,
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
        throw new BadRequestException('No tasks were updated. Check task IDs or organization access.');
      }

      return { updatedCount: result.count };
    } catch (error) {
      console.error('Error updating task statuses:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update task statuses');
    }
  }
}
