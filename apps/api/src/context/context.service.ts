import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  async findAllByOrganization(organizationId: string) {
    try {
      const contextEntries = await db.context.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(
        `Retrieved ${contextEntries.length} context entries for organization ${organizationId}`,
      );
      return contextEntries;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve context entries for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const contextEntry = await db.context.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!contextEntry) {
        throw new NotFoundException(
          `Context entry with ID ${id} not found in organization ${organizationId}`,
        );
      }

      this.logger.log(
        `Retrieved context entry: ${contextEntry.question.substring(0, 50)}... (${id})`,
      );
      return contextEntry;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve context entry ${id}:`, error);
      throw error;
    }
  }

  async create(organizationId: string, createContextDto: CreateContextDto) {
    try {
      const contextEntry = await db.context.create({
        data: {
          ...createContextDto,
          organizationId,
        },
      });

      this.logger.log(
        `Created new context entry: ${contextEntry.question.substring(0, 50)}... (${contextEntry.id}) for organization ${organizationId}`,
      );
      return contextEntry;
    } catch (error) {
      this.logger.error(
        `Failed to create context entry for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateContextDto: UpdateContextDto,
  ) {
    try {
      // First check if the context entry exists in the organization
      await this.findById(id, organizationId);

      const updatedContextEntry = await db.context.update({
        where: { id },
        data: updateContextDto,
      });

      this.logger.log(
        `Updated context entry: ${updatedContextEntry.question.substring(0, 50)}... (${id})`,
      );
      return updatedContextEntry;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update context entry ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the context entry exists in the organization
      const existingContextEntry = await this.findById(id, organizationId);

      await db.context.delete({
        where: { id },
      });

      this.logger.log(
        `Deleted context entry: ${existingContextEntry.question.substring(0, 50)}... (${id})`,
      );
      return {
        message: 'Context entry deleted successfully',
        deletedContext: {
          id: existingContextEntry.id,
          question: existingContextEntry.question,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete context entry ${id}:`, error);
      throw error;
    }
  }
}
