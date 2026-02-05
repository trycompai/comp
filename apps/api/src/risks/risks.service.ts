import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, Prisma } from '@trycompai/db';
import { CreateRiskDto } from './dto/create-risk.dto';
import { GetRisksQueryDto } from './dto/get-risks-query.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

export interface PaginatedRisksResult {
  data: Prisma.RiskGetPayload<{
    include: {
      assignee: {
        include: {
          user: {
            select: { id: true; name: true; email: true; image: true };
          };
        };
      };
    };
  }>[];
  totalCount: number;
  page: number;
  pageCount: number;
}

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);

  async findAllByOrganization(
    organizationId: string,
    assignmentFilter: Prisma.RiskWhereInput = {},
    query: GetRisksQueryDto = {},
  ): Promise<PaginatedRisksResult> {
    const {
      title,
      page = 1,
      perPage = 50,
      sort = 'createdAt',
      sortDirection = 'desc',
      status,
      category,
      department,
      assigneeId,
    } = query;

    try {
      const where: Prisma.RiskWhereInput = {
        organizationId,
        ...assignmentFilter,
        ...(title && {
          title: { contains: title, mode: Prisma.QueryMode.insensitive },
        }),
        ...(status && { status }),
        ...(category && { category }),
        ...(department && { department }),
        ...(assigneeId && { assigneeId }),
      };

      const [risks, totalCount] = await Promise.all([
        db.risk.findMany({
          where,
          skip: (page - 1) * perPage,
          take: perPage,
          orderBy: { [sort]: sortDirection },
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
        }),
        db.risk.count({ where }),
      ]);

      const pageCount = Math.ceil(totalCount / perPage);

      this.logger.log(
        `Retrieved ${risks.length} risks (page ${page}/${pageCount}) for organization ${organizationId}`,
      );

      return { data: risks, totalCount, page, pageCount };
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
