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
        // Latest published FrameworkVersion per framework, resolved in a single
        // query rather than N+1 client-side fetches. Falls back to the
        // framework's catalog version string when no versions exist yet.
        versions: {
          orderBy: { publishedAt: 'desc' },
          take: 1,
          select: { id: true, version: true, publishedAt: true },
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
      latestVersion: fw.versions[0] ?? null,
      _count: undefined,
      requirements: undefined,
      versions: undefined,
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

    const controls = await db.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { frameworkId } } },
      include: {
        requirements: {
          select: {
            id: true,
            name: true,
            framework: { select: { name: true } },
          },
        },
        frameworkPolicyLinks: {
          where: { frameworkId },
          select: { policyTemplate: { select: { id: true, name: true } } },
        },
        frameworkTaskLinks: {
          where: { frameworkId },
          select: { taskTemplate: { select: { id: true, name: true } } },
        },
        frameworkDocumentLinks: {
          where: { frameworkId },
          select: { formType: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return controls.map(
      ({
        frameworkPolicyLinks,
        frameworkTaskLinks,
        frameworkDocumentLinks,
        ...control
      }) => ({
        ...control,
        policyTemplates: frameworkPolicyLinks.map(
          (link) => link.policyTemplate,
        ),
        taskTemplates: frameworkTaskLinks.map((link) => link.taskTemplate),
        documentTypes: frameworkDocumentLinks.map((link) => link.formType),
      }),
    );
  }

  async getPolicies(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorPolicyTemplate.findMany({
      where: {
        frameworkControlLinks: {
          some: { frameworkId },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTasks(frameworkId: string) {
    await this.findById(frameworkId);

    return db.frameworkEditorTaskTemplate.findMany({
      where: {
        frameworkControlLinks: {
          some: { frameworkId },
        },
      },
      include: {
        frameworkControlLinks: {
          where: { frameworkId },
          select: { controlTemplate: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }).then((tasks) =>
      tasks.map(({ frameworkControlLinks, ...task }) => ({
        ...task,
        controlTemplates: frameworkControlLinks.map(
          (link) => link.controlTemplate,
        ),
      })),
    );
  }

  async getDocuments(frameworkId: string) {
    await this.findById(frameworkId);

    const controls = await db.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { frameworkId } } },
      select: {
        id: true,
        name: true,
        frameworkDocumentLinks: {
          where: { frameworkId },
          select: { formType: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return controls.map(({ frameworkDocumentLinks, ...control }) => ({
      ...control,
      documentTypes: frameworkDocumentLinks.map((link) => link.formType),
    }));
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
      .then((cts) => cts.map((ct) => ct.id));

    if (controlIds.length === 0) {
      throw new ConflictException(
        'Framework has no controls to link the task to',
      );
    }

    await db.frameworkEditorControlTaskTemplateLink.createMany({
      data: controlIds.map((controlTemplateId) => ({
        frameworkId,
        controlTemplateId,
        taskTemplateId: taskId,
      })),
      skipDuplicates: true,
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
      .then((cts) => cts.map((ct) => ct.id));

    if (controlIds.length === 0) {
      throw new ConflictException(
        'Framework has no controls to link the policy to',
      );
    }

    await db.frameworkEditorControlPolicyTemplateLink.createMany({
      data: controlIds.map((controlTemplateId) => ({
        frameworkId,
        controlTemplateId,
        policyTemplateId: policyId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Linked policy ${policyId} to framework ${frameworkId}`);
    return { message: 'Policy linked to framework' };
  }
}
