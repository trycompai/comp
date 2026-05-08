import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@db';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@Injectable()
export class RequirementService {
  private readonly logger = new Logger(RequirementService.name);

  async findAll(take = 500, skip = 0) {
    return db.frameworkEditorRequirement.findMany({
      take,
      skip,
      orderBy: { name: 'asc' },
      include: {
        framework: { select: { id: true, name: true } },
      },
    });
  }

  async findAllForFramework(frameworkId: string) {
    return db.frameworkEditorRequirement.findMany({
      where: { frameworkId },
      orderBy: { name: 'asc' },
      include: {
        controlTemplates: { select: { id: true, name: true } },
      },
    });
  }

  async create(dto: CreateRequirementDto) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: dto.frameworkId },
    });
    if (!framework) {
      throw new NotFoundException(`Framework ${dto.frameworkId} not found`);
    }

    const req = await db.frameworkEditorRequirement.create({
      data: {
        frameworkId: dto.frameworkId,
        name: dto.name,
        identifier: dto.identifier ?? '',
        description: dto.description ?? '',
      },
    });
    this.logger.log(`Created requirement: ${req.name} (${req.id})`);
    return req;
  }

  async update(id: string, dto: UpdateRequirementDto) {
    const existing = await db.frameworkEditorRequirement.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    const updated = await db.frameworkEditorRequirement.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Updated requirement: ${updated.name} (${id})`);
    return updated;
  }

  async delete(id: string) {
    const existing = await db.frameworkEditorRequirement.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    await db.frameworkEditorRequirement.delete({ where: { id } });
    this.logger.log(`Deleted requirement ${id}`);
    return { message: 'Requirement deleted successfully' };
  }
}
