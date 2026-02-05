import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateFindingTemplateDto } from './dto/create-finding-template.dto';
import { UpdateFindingTemplateDto } from './dto/update-finding-template.dto';

@Injectable()
export class FindingTemplateService {
  private readonly logger = new Logger(FindingTemplateService.name);

  async findAll() {
    try {
      const templates = await db.findingTemplate.findMany({
        orderBy: [{ category: 'asc' }, { order: 'asc' }, { title: 'asc' }],
      });

      this.logger.log(`Retrieved ${templates.length} finding templates`);
      return templates;
    } catch (error) {
      this.logger.error('Failed to retrieve finding templates:', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      const template = await db.findingTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new NotFoundException(`Finding template with ID ${id} not found`);
      }

      this.logger.log(`Retrieved finding template: ${template.title} (${id})`);
      return template;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve finding template ${id}:`, error);
      throw error;
    }
  }

  async create(createDto: CreateFindingTemplateDto) {
    try {
      const template = await db.findingTemplate.create({
        data: {
          category: createDto.category,
          title: createDto.title,
          content: createDto.content,
          order: createDto.order ?? 0,
        },
      });

      this.logger.log(
        `Created finding template: ${template.title} (${template.id})`,
      );
      return template;
    } catch (error) {
      this.logger.error('Failed to create finding template:', error);
      throw error;
    }
  }

  async updateById(id: string, updateDto: UpdateFindingTemplateDto) {
    try {
      // First check if the template exists
      await this.findById(id);

      const updatedTemplate = await db.findingTemplate.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(
        `Updated finding template: ${updatedTemplate.title} (${id})`,
      );
      return updatedTemplate;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update finding template ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string) {
    try {
      // First check if the template exists
      const existingTemplate = await this.findById(id);

      await db.findingTemplate.delete({
        where: { id },
      });

      this.logger.log(
        `Deleted finding template: ${existingTemplate.title} (${id})`,
      );
      return {
        message: 'Finding template deleted successfully',
        deletedTemplate: {
          id: existingTemplate.id,
          title: existingTemplate.title,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete finding template ${id}:`, error);
      throw error;
    }
  }
}
