import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import type { EvidenceFormType } from '@db';
import { CreateControlTemplateDto } from './dto/create-control-template.dto';
import { UpdateControlTemplateDto } from './dto/update-control-template.dto';

@Injectable()
export class ControlTemplateService {
  private readonly logger = new Logger(ControlTemplateService.name);

  async findAll(take = 500, skip = 0, frameworkId?: string) {
    return db.frameworkEditorControlTemplate.findMany({
      take,
      skip,
      orderBy: { createdAt: 'asc' },
      where: frameworkId
        ? { requirements: { some: { frameworkId } } }
        : undefined,
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

  async create(dto: CreateControlTemplateDto, frameworkId?: string) {
    const requirementIds = frameworkId
      ? await db.frameworkEditorRequirement
          .findMany({
            where: { frameworkId },
            select: { id: true },
          })
          .then((reqs) => reqs.map((r) => ({ id: r.id })))
      : [];

    const ct = await db.frameworkEditorControlTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        ...(dto.documentTypes && {
          documentTypes: dto.documentTypes as EvidenceFormType[],
        }),
        ...(requirementIds.length > 0 && {
          requirements: { connect: requirementIds },
        }),
      },
    });
    this.logger.log(`Created control template: ${ct.name} (${ct.id})`);
    return ct;
  }

  async update(id: string, dto: UpdateControlTemplateDto) {
    await this.findById(id);
    const updated = await db.frameworkEditorControlTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.documentTypes !== undefined && {
          documentTypes: dto.documentTypes as EvidenceFormType[],
        }),
      },
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

  async linkPolicyTemplate(controlId: string, policyTemplateId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { policyTemplates: { connect: { id: policyTemplateId } } },
    });
    return { message: 'Policy template linked' };
  }

  async unlinkPolicyTemplate(controlId: string, policyTemplateId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { policyTemplates: { disconnect: { id: policyTemplateId } } },
    });
    return { message: 'Policy template unlinked' };
  }

  async linkTaskTemplate(controlId: string, taskTemplateId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { taskTemplates: { connect: { id: taskTemplateId } } },
    });
    return { message: 'Task template linked' };
  }

  async unlinkTaskTemplate(controlId: string, taskTemplateId: string) {
    await db.frameworkEditorControlTemplate.update({
      where: { id: controlId },
      data: { taskTemplates: { disconnect: { id: taskTemplateId } } },
    });
    return { message: 'Task template unlinked' };
  }
}
