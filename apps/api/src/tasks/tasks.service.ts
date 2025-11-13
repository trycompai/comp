import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
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
}
