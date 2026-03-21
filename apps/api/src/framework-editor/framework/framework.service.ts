import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateFrameworkDto } from './dto/create-framework.dto';
import { UpdateFrameworkDto } from './dto/update-framework.dto';

@Injectable()
export class FrameworkEditorFrameworkService {
  private readonly logger = new Logger(FrameworkEditorFrameworkService.name);

  async findAll(take = 500, skip = 0) {
    const frameworks = await db.frameworkEditorFramework.findMany({
      take,
      skip,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { requirements: true } },
        requirements: {
          select: { _count: { select: { controlTemplates: true } } },
        },
      },
    });

    return frameworks.map((fw) => ({
      ...fw,
      requirementsCount: fw._count.requirements,
      controlsCount: fw.requirements.reduce(
        (sum, r) => sum + r._count.controlTemplates,
        0,
      ),
      _count: undefined,
      requirements: undefined,
    }));
  }

  async findById(id: string) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id },
      include: {
        requirements: {
          orderBy: { name: 'asc' },
          include: {
            controlTemplates: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!framework) {
      throw new NotFoundException(`Framework ${id} not found`);
    }

    return framework;
  }

  async create(dto: CreateFrameworkDto) {
    const framework = await db.frameworkEditorFramework.create({
      data: {
        name: dto.name,
        version: dto.version,
        description: dto.description,
        visible: dto.visible ?? false,
      },
    });

    this.logger.log(`Created framework: ${framework.name} (${framework.id})`);
    return framework;
  }

  async update(id: string, dto: UpdateFrameworkDto) {
    await this.findById(id);

    const updated = await db.frameworkEditorFramework.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Updated framework: ${updated.name} (${id})`);
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);

    await db.$transaction([
      db.frameworkEditorRequirement.deleteMany({
        where: { frameworkId: id },
      }),
      db.frameworkEditorFramework.delete({ where: { id } }),
    ]);

    this.logger.log(`Deleted framework ${id}`);
    return { message: 'Framework deleted successfully' };
  }

  async getControls(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { frameworkId } } },
      include: {
        policyTemplates: { select: { id: true, name: true } },
        requirements: {
          select: {
            id: true,
            name: true,
            framework: { select: { name: true } },
          },
        },
        taskTemplates: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPolicies(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorPolicyTemplate.findMany({
      where: {
        controlTemplates: {
          some: { requirements: { some: { frameworkId } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTasks(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorTaskTemplate.findMany({
      where: {
        controlTemplates: {
          some: { requirements: { some: { frameworkId } } },
        },
      },
      include: {
        controlTemplates: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDocuments(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { frameworkId } } },
      select: { id: true, name: true, documentTypes: true },
      orderBy: { name: 'asc' },
    });
  }
}
