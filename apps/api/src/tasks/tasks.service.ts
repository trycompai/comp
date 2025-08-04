import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { db } from '@trycompai/db';
import {
  CreateTaskDto,
  PaginatedTasksResponseDto,
  TaskQueryDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './schemas/task.schemas';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  async create(
    createTaskDto: CreateTaskDto,
    organizationId: string,
  ): Promise<TaskResponseDto> {
    try {
      const task = await db.task.create({
        data: {
          ...createTaskDto,
          organizationId,
        },
      });

      this.logger.log(
        `Created task ${task.id} for organization ${organizationId}`,
      );
      return task;
    } catch (error) {
      this.logger.error(
        `Failed to create task for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findAll(
    query: TaskQueryDto,
    organizationId: string,
  ): Promise<PaginatedTasksResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause with organization isolation
    const where: Prisma.TaskWhereInput = {
      organizationId,
    };

    // Add filters - Zod ensures proper types
    if (query.status) {
      where.status = query.status;
    }
    if (query.frequency) {
      where.frequency = query.frequency;
    }
    if (query.department) {
      where.department = query.department;
    }
    if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }
    if (query.search !== undefined) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    try {
      const [tasks, total] = await Promise.all([
        db.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        }),
        db.task.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Retrieved ${tasks.length} tasks for organization ${organizationId} (page ${page})`,
      );

      return {
        tasks,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve tasks for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findOne(id: string, organizationId: string): Promise<TaskResponseDto> {
    try {
      const task = await db.task.findFirst({
        where: {
          id,
          organizationId, // Enforce organization isolation
        },
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      this.logger.log(
        `Retrieved task ${id} for organization ${organizationId}`,
      );
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve task ${id} for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    organizationId: string,
  ): Promise<TaskResponseDto> {
    // First verify the task exists and belongs to the organization
    await this.findOne(id, organizationId);

    try {
      const task = await db.task.update({
        where: { id },
        data: updateTaskDto,
      });

      this.logger.log(`Updated task ${id} for organization ${organizationId}`);
      return task;
    } catch (error) {
      this.logger.error(
        `Failed to update task ${id} for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async remove(id: string, organizationId: string): Promise<void> {
    // First verify the task exists and belongs to the organization
    await this.findOne(id, organizationId);

    try {
      await db.task.delete({
        where: { id },
      });

      this.logger.log(`Deleted task ${id} for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete task ${id} for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async markComplete(
    id: string,
    organizationId: string,
  ): Promise<TaskResponseDto> {
    // First verify the task exists and belongs to the organization
    await this.findOne(id, organizationId);

    try {
      const task = await db.task.update({
        where: { id },
        data: {
          status: 'done',
          lastCompletedAt: new Date(),
        },
      });

      this.logger.log(
        `Marked task ${id} as complete for organization ${organizationId}`,
      );
      return task;
    } catch (error) {
      this.logger.error(
        `Failed to mark task ${id} as complete for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }
}
