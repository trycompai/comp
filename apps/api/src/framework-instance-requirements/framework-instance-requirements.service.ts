import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateFrameworkInstanceRequirementDto } from './dto/create-framework-instance-requirement.dto';
import { UpdateFrameworkInstanceRequirementDto } from './dto/update-framework-instance-requirement.dto';

@Injectable()
export class FrameworkInstanceRequirementsService {
  private readonly logger = new Logger(
    FrameworkInstanceRequirementsService.name,
  );

  async findAll(frameworkInstanceId: string, organizationId: string) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
    });

    if (!frameworkInstance) {
      throw new NotFoundException(
        `Framework instance ${frameworkInstanceId} not found`,
      );
    }

    return db.frameworkInstanceRequirement.findMany({
      where: { frameworkInstanceId },
      orderBy: { name: 'asc' },
      include: {
        requirementMaps: {
          include: {
            control: {
              include: {
                tasks: true,
                policies: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const requirement = await db.frameworkInstanceRequirement.findUnique({
      where: { id },
      include: {
        frameworkInstance: true,
        requirementMaps: {
          include: {
            control: {
              include: {
                tasks: true,
                policies: true,
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    if (requirement.frameworkInstance.organizationId !== organizationId) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    return requirement;
  }

  async create(
    dto: CreateFrameworkInstanceRequirementDto,
    organizationId: string,
  ) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: dto.frameworkInstanceId, organizationId },
    });

    if (!frameworkInstance) {
      throw new NotFoundException(
        `Framework instance ${dto.frameworkInstanceId} not found`,
      );
    }

    const requirement = await db.frameworkInstanceRequirement.create({
      data: {
        frameworkInstanceId: dto.frameworkInstanceId,
        name: dto.name,
        identifier: dto.identifier ?? '',
        description: dto.description,
      },
    });

    if (dto.controlIds && dto.controlIds.length > 0) {
      await Promise.all(
        dto.controlIds.map((controlId) =>
          db.requirementMap.create({
            data: {
              controlId,
              frameworkInstanceRequirementId: requirement.id,
              frameworkInstanceId: dto.frameworkInstanceId,
            },
          }),
        ),
      );
    }

    this.logger.log(
      `Created framework instance requirement: ${requirement.name} (${requirement.id})`,
    );
    return requirement;
  }

  async update(
    id: string,
    dto: UpdateFrameworkInstanceRequirementDto,
    organizationId: string,
  ) {
    const existing = await db.frameworkInstanceRequirement.findUnique({
      where: { id },
      include: { frameworkInstance: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    if (existing.frameworkInstance.organizationId !== organizationId) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    const updated = await db.frameworkInstanceRequirement.update({
      where: { id },
      data: dto,
    });

    this.logger.log(
      `Updated framework instance requirement: ${updated.name} (${id})`,
    );
    return updated;
  }

  async delete(id: string, organizationId: string) {
    const existing = await db.frameworkInstanceRequirement.findUnique({
      where: { id },
      include: { frameworkInstance: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    if (existing.frameworkInstance.organizationId !== organizationId) {
      throw new NotFoundException(
        `Framework instance requirement ${id} not found`,
      );
    }

    await db.frameworkInstanceRequirement.delete({ where: { id } });
    this.logger.log(`Deleted framework instance requirement ${id}`);
    return { message: 'Framework instance requirement deleted successfully' };
  }
}
