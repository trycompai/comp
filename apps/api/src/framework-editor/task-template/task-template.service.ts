import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';

@Injectable()
export class TaskTemplateService {
  private readonly logger = new Logger(TaskTemplateService.name);

  async findAll() {
    try {
      const taskTemplates = await db.frameworkEditorTaskTemplate.findMany({
        orderBy: { name: 'asc' },
      });

      this.logger.log(
        `Retrieved ${taskTemplates.length} framework editor task templates`,
      );
      return taskTemplates;
    } catch (error) {
      this.logger.error(
        'Failed to retrieve framework editor task templates:',
        error,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      const taskTemplate = await db.frameworkEditorTaskTemplate.findUnique({
        where: { id },
      });

      if (!taskTemplate) {
        throw new NotFoundException(
          `Framework editor task template with ID ${id} not found`,
        );
      }

      this.logger.log(
        `Retrieved framework editor task template: ${taskTemplate.name} (${id})`,
      );
      return taskTemplate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve framework editor task template ${id}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(id: string, updateDto: UpdateTaskTemplateDto) {
    try {
      // First check if the task template exists
      await this.findById(id);

      const updatedTaskTemplate = await db.frameworkEditorTaskTemplate.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(
        `Updated framework editor task template: ${updatedTaskTemplate.name} (${id})`,
      );
      return updatedTaskTemplate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update framework editor task template ${id}:`,
        error,
      );
      throw error;
    }
  }

  async deleteById(id: string) {
    try {
      // First check if the task template exists
      const existingTaskTemplate = await this.findById(id);

      await db.frameworkEditorTaskTemplate.delete({
        where: { id },
      });

      this.logger.log(
        `Deleted framework editor task template: ${existingTaskTemplate.name} (${id})`,
      );
      return {
        message: 'Framework editor task template deleted successfully',
        deletedTaskTemplate: {
          id: existingTaskTemplate.id,
          name: existingTaskTemplate.name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete framework editor task template ${id}:`,
        error,
      );
      throw error;
    }
  }
}
