import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { db, Prisma } from '@db';
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
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visible !== undefined && { visible: dto.visible }),
      },
    });

    this.logger.log(`Updated framework: ${updated.name} (${id})`);
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);

    try {
      await db.$transaction([
        db.frameworkEditorRequirement.deleteMany({
          where: { frameworkId: id },
        }),
        db.frameworkEditorFramework.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete framework: it is referenced by existing framework instances',
        );
      }
      throw error;
    }

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

  async linkControl(frameworkId: string, controlId: string) {
    await this.findById(frameworkId);

    const requirementIds = await db.frameworkEditorRequirement
      .findMany({ where: { frameworkId }, select: { id: true } })
      .then((reqs) => reqs.map((r) => ({ id: r.id })));

    if (requirementIds.length === 0) {
      throw new ConflictException(
        'Framework has no requirements to link the control to',
      );
    }

    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { requirements: { connect: requirementIds } },
    });

    this.logger.log(`Linked control ${controlId} to framework ${frameworkId}`);
    return { message: 'Control linked to framework' };
  }

  async linkTask(frameworkId: string, taskId: string) {
    await this.findById(frameworkId);

    const controlIds = await db.frameworkEditorControlTemplate
      .findMany({
        where: { requirements: { some: { frameworkId } } },
        select: { id: true },
      })
      .then((cts) => cts.map((ct) => ({ id: ct.id })));

    if (controlIds.length === 0) {
      throw new ConflictException(
        'Framework has no controls to link the task to',
      );
    }

    await db.frameworkEditorTaskTemplate.update({
      where: { id: taskId },
      data: { controlTemplates: { connect: controlIds } },
    });

    this.logger.log(`Linked task ${taskId} to framework ${frameworkId}`);
    return { message: 'Task linked to framework' };
  }

  async linkPolicy(frameworkId: string, policyId: string) {
    await this.findById(frameworkId);

    const controlIds = await db.frameworkEditorControlTemplate
      .findMany({
        where: { requirements: { some: { frameworkId } } },
        select: { id: true },
      })
      .then((cts) => cts.map((ct) => ({ id: ct.id })));

    if (controlIds.length === 0) {
      throw new ConflictException(
        'Framework has no controls to link the policy to',
      );
    }

    await db.frameworkEditorPolicyTemplate.update({
      where: { id: policyId },
      data: { controlTemplates: { connect: controlIds } },
    });

    this.logger.log(`Linked policy ${policyId} to framework ${frameworkId}`);
    return { message: 'Policy linked to framework' };
  }
}
