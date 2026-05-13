import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import type { EvidenceFormType } from '@db';
import { CreateControlTemplateDto } from './dto/create-control-template.dto';
import { UpdateControlTemplateDto } from './dto/update-control-template.dto';

@Injectable()
export class ControlTemplateService {
  private readonly logger = new Logger(ControlTemplateService.name);

  async findAll(take = 500, skip = 0, frameworkId?: string) {
    if (frameworkId) {
      const controls = await db.frameworkEditorControlTemplate.findMany({
        take,
        skip,
        orderBy: { createdAt: 'asc' },
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

    const controls = await db.frameworkEditorControlTemplate.findMany({
      take,
      skip,
      orderBy: { createdAt: 'asc' },
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
    });
    return controls;
  }

  async findById(id: string) {
    const ct = await db.frameworkEditorControlTemplate.findUnique({
      where: { id },
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
    });
    if (!ct) throw new NotFoundException(`Control template ${id} not found`);
    return ct;
  }

  async create(dto: CreateControlTemplateDto) {
    if (dto.documentTypes === undefined) {
      const ct = await db.frameworkEditorControlTemplate.create({
        data: {
          name: dto.name,
          description: dto.description ?? '',
        },
      });
      this.logger.log(`Created control template: ${ct.name} (${ct.id})`);
      return ct;
    }

    const scopedFrameworkId = await this.ensureFramework(dto.frameworkId);
    const uniqueFormTypes = Array.from(
      new Set(dto.documentTypes as EvidenceFormType[]),
    );
    const ct = await db.$transaction(async (tx) => {
      const created = await tx.frameworkEditorControlTemplate.create({
        data: {
          name: dto.name,
          description: dto.description ?? '',
        },
      });
      await tx.frameworkEditorControlDocumentTypeLink.createMany({
        data: uniqueFormTypes.map((formType) => ({
          frameworkId: scopedFrameworkId,
          controlTemplateId: created.id,
          formType,
        })),
        skipDuplicates: true,
      });
      return created;
    });
    this.logger.log(`Created control template: ${ct.name} (${ct.id})`);
    return ct;
  }

  async update(id: string, dto: UpdateControlTemplateDto) {
    if (dto.documentTypes === undefined) {
      await this.findById(id);
      const updated = await db.frameworkEditorControlTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
      });
      this.logger.log(`Updated control template: ${updated.name} (${id})`);
      return updated;
    }

    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId: id,
      frameworkId: dto.frameworkId,
    });
    const uniqueFormTypes = Array.from(
      new Set(dto.documentTypes as EvidenceFormType[]),
    );
    const updated = await db.$transaction(async (tx) => {
      const control = await tx.frameworkEditorControlTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
      });
      await tx.frameworkEditorControlDocumentTypeLink.deleteMany({
        where: {
          frameworkId: scopedFrameworkId,
          controlTemplateId: id,
        },
      });
      await tx.frameworkEditorControlDocumentTypeLink.createMany({
        data: uniqueFormTypes.map((formType) => ({
          frameworkId: scopedFrameworkId,
          controlTemplateId: id,
          formType,
        })),
        skipDuplicates: true,
      });
      return control;
    });
    this.logger.log(`Updated control template: ${updated.name} (${id})`);
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    try {
      await db.frameworkEditorControlTemplate.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete control template: it is referenced by existing controls',
        );
      }
      throw error;
    }
    this.logger.log(`Deleted control template ${id}`);
    return { message: 'Control template deleted successfully' };
  }

  async linkRequirement(controlId: string, requirementId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { requirements: { connect: { id: requirementId } } },
    });
    return { message: 'Requirement linked' };
  }

  async unlinkRequirement(controlId: string, requirementId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { requirements: { disconnect: { id: requirementId } } },
    });
    return { message: 'Requirement unlinked' };
  }

  async linkPolicyTemplate(
    controlId: string,
    policyTemplateId: string,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlPolicyTemplateLink.createMany({
      data: [{
        frameworkId: scopedFrameworkId,
        controlTemplateId: controlId,
        policyTemplateId,
      }],
      skipDuplicates: true,
    });
    return { message: 'Policy template linked' };
  }

  async unlinkPolicyTemplate(
    controlId: string,
    policyTemplateId: string,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlPolicyTemplateLink.deleteMany({
      where: {
        frameworkId: scopedFrameworkId,
        controlTemplateId: controlId,
        policyTemplateId,
      },
    });
    return { message: 'Policy template unlinked' };
  }

  async linkTaskTemplate(
    controlId: string,
    taskTemplateId: string,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlTaskTemplateLink.createMany({
      data: [{
        frameworkId: scopedFrameworkId,
        controlTemplateId: controlId,
        taskTemplateId,
      }],
      skipDuplicates: true,
    });
    return { message: 'Task template linked' };
  }

  async unlinkTaskTemplate(
    controlId: string,
    taskTemplateId: string,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlTaskTemplateLink.deleteMany({
      where: {
        frameworkId: scopedFrameworkId,
        controlTemplateId: controlId,
        taskTemplateId,
      },
    });
    return { message: 'Task template unlinked' };
  }

  async linkDocumentType(
    controlId: string,
    formType: EvidenceFormType,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlDocumentTypeLink.createMany({
      data: [{
        frameworkId: scopedFrameworkId,
        controlTemplateId: controlId,
        formType,
      }],
      skipDuplicates: true,
    });
    return { message: 'Document type linked' };
  }

  async unlinkDocumentType(
    controlId: string,
    formType: EvidenceFormType,
    frameworkId?: string,
  ) {
    const scopedFrameworkId = await this.ensureFrameworkScopedControl({
      controlId,
      frameworkId,
    });
    await db.frameworkEditorControlDocumentTypeLink.deleteMany({
      where: { frameworkId: scopedFrameworkId, controlTemplateId: controlId, formType },
    });
    return { message: 'Document type unlinked' };
  }

  private async ensureFrameworkScopedControl(params: {
    controlId: string;
    frameworkId?: string;
  }): Promise<string> {
    const frameworkId = await this.ensureFramework(params.frameworkId);
    const control = await db.frameworkEditorControlTemplate.findUnique({
      where: { id: params.controlId },
      select: { id: true },
    });
    if (!control) {
      throw new NotFoundException(
        `Control template ${params.controlId} not found`,
      );
    }
    return frameworkId;
  }

  private async ensureFramework(frameworkId?: string): Promise<string> {
    if (!frameworkId) {
      throw new BadRequestException(
        'frameworkId is required for policy, task, and document links',
      );
    }
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      select: { id: true },
    });
    if (!framework) throw new NotFoundException('Framework not found');
    return frameworkId;
  }
}
