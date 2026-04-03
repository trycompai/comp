import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import { CreatePolicyTemplateDto } from './dto/create-policy-template.dto';
import { UpdatePolicyTemplateDto } from './dto/update-policy-template.dto';

@Injectable()
export class PolicyTemplateService {
  private readonly logger = new Logger(PolicyTemplateService.name);

  async findAll(take = 500, skip = 0, frameworkId?: string) {
    return db.frameworkEditorPolicyTemplate.findMany({
      take,
      skip,
      orderBy: { name: 'asc' },
      where: frameworkId
        ? {
            controlTemplates: {
              some: { requirements: { some: { frameworkId } } },
            },
          }
        : undefined,
      include: {
        controlTemplates: {
          select: {
            id: true,
            name: true,
            requirements: {
              select: {
                framework: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const pt = await db.frameworkEditorPolicyTemplate.findUnique({
      where: { id },
    });
    if (!pt) throw new NotFoundException(`Policy template ${id} not found`);
    return pt;
  }

  async create(dto: CreatePolicyTemplateDto, frameworkId?: string) {
    const controlIds = frameworkId
      ? await db.frameworkEditorControlTemplate
          .findMany({
            where: { requirements: { some: { frameworkId } } },
            select: { id: true },
          })
          .then((cts) => cts.map((ct) => ({ id: ct.id })))
      : [];

    const pt = await db.frameworkEditorPolicyTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        frequency: dto.frequency,
        department: dto.department,
        content: {},
        ...(controlIds.length > 0 && {
          controlTemplates: { connect: controlIds },
        }),
      },
    });
    this.logger.log(`Created policy template: ${pt.name} (${pt.id})`);
    return pt;
  }

  async update(id: string, dto: UpdatePolicyTemplateDto) {
    await this.findById(id);
    const updated = await db.frameworkEditorPolicyTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.department !== undefined && { department: dto.department }),
      },
    });
    this.logger.log(`Updated policy template: ${updated.name} (${id})`);
    return updated;
  }

  async updateContent(id: string, content: Record<string, unknown>) {
    await this.findById(id);
    const updated = await db.frameworkEditorPolicyTemplate.update({
      where: { id },
      data: { content: content as Prisma.InputJsonValue },
    });
    this.logger.log(`Updated policy content for ${id}`);
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    try {
      await db.frameworkEditorPolicyTemplate.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete policy template: it is referenced by existing policies',
        );
      }
      throw error;
    }
    this.logger.log(`Deleted policy template ${id}`);
    return { message: 'Policy template deleted successfully' };
  }
}
