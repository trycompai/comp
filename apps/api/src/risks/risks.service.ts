import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);

  async findAllByOrganization(organizationId: string) {
    try {
      const risks = await db.risk.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
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
          },
        },
      });

      this.logger.log(
        `Retrieved ${risks.length} risks for organization ${organizationId}`,
      );
      return risks;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve risks for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const risk = await db.risk.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          assignee: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!risk) {
        throw new NotFoundException(
          `Risk with ID ${id} not found in organization ${organizationId}`,
        );
      }

      this.logger.log(`Retrieved risk: ${risk.title} (${id})`);
      return risk;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve risk ${id}:`, error);
      throw error;
    }
  }

  async create(organizationId: string, createRiskDto: CreateRiskDto) {
    try {
      const risk = await db.risk.create({
        data: {
          ...createRiskDto,
          organizationId,
        },
      });

      this.logger.log(
        `Created new risk: ${risk.title} (${risk.id}) for organization ${organizationId}`,
      );
      return risk;
    } catch (error) {
      this.logger.error(
        `Failed to create risk for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateRiskDto: UpdateRiskDto,
  ) {
    try {
      // First check if the risk exists in the organization
      await this.findById(id, organizationId);

      const updatedRisk = await db.risk.update({
        where: { id },
        data: updateRiskDto,
      });

      this.logger.log(`Updated risk: ${updatedRisk.title} (${id})`);
      return updatedRisk;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update risk ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the risk exists in the organization
      const existingRisk = await this.findById(id, organizationId);

      await db.risk.delete({
        where: { id },
      });

      this.logger.log(`Deleted risk: ${existingRisk.title} (${id})`);
      return {
        message: 'Risk deleted successfully',
        deletedRisk: {
          id: existingRisk.id,
          title: existingRisk.title,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete risk ${id}:`, error);
      throw error;
    }
  }
}
