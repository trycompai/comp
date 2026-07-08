import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import { isMemberOrgParticipant } from '../utils/org-participation';
import { CreateRiskDto } from './dto/create-risk.dto';
import { GetRisksQueryDto } from './dto/get-risks-query.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { resolveStrategyDescriptionUpdate } from './strategy-descriptions';

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

  private async validateAssigneeNotPlatformAdmin(
    assigneeId: string,
    organizationId: string,
  ) {
    const member = await db.member.findFirst({
      where: { id: assigneeId, organizationId },
      include: { user: { select: { role: true } } },
    });
    if (
      member &&
      !(await isMemberOrgParticipant(member.user.role, organizationId))
    ) {
      throw new BadRequestException(
        'Cannot assign a platform admin as assignee',
      );
    }
  }

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
            // Linked task statuses are needed by the table to compute the
            // current (interpolated) severity score so the badge reflects
            // treatment progress, not just inherent risk.
            tasks: { select: { id: true, status: true } },
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
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              controls: { select: { id: true, name: true } },
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
      if (createRiskDto.assigneeId) {
        await this.validateAssigneeNotPlatformAdmin(
          createRiskDto.assigneeId,
          organizationId,
        );
      }
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
      // Need the existing row to resolve strategy/description swaps below.
      const existing = await this.findById(id, organizationId);

      if (updateRiskDto.assigneeId) {
        await this.validateAssigneeNotPlatformAdmin(
          updateRiskDto.assigneeId,
          organizationId,
        );
      }

      // Keep per-strategy descriptions independent in the strategyDescriptions
      // JSON map: a Mitigate plan, an Accept rationale, and a Transfer
      // rationale all live alongside each other, swapped in/out of the active
      // `treatmentStrategyDescription` field as the user changes strategy.
      const resolvedStrategyFields = resolveStrategyDescriptionUpdate(
        existing,
        updateRiskDto,
      );

      const updatedRisk = await db.risk.update({
        where: { id },
        data: { ...updateRiskDto, ...resolvedStrategyFields },
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

  async getStatsByAssignee(organizationId: string) {
    const members = await db.member.findMany({
      where: { organizationId },
      select: {
        id: true,
        risks: {
          where: { organizationId },
          select: { status: true },
        },
        user: {
          select: { name: true, image: true, email: true },
        },
      },
    });

    return members
      .filter((m) => m.risks.length > 0)
      .map((m) => ({
        id: m.id,
        user: m.user,
        totalRisks: m.risks.length,
        openRisks: m.risks.filter((r) => r.status === 'open').length,
        pendingRisks: m.risks.filter((r) => r.status === 'pending').length,
        closedRisks: m.risks.filter((r) => r.status === 'closed').length,
        archivedRisks: m.risks.filter((r) => r.status === 'archived').length,
      }));
  }

  async getStatsByDepartment(organizationId: string) {
    return db.risk.groupBy({
      by: ['department'],
      where: { organizationId },
      _count: true,
    });
  }
}
