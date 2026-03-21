import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, type Prisma } from '@trycompai/db';
import { CreatePolicyTemplateDto } from './dto/create-policy-template.dto';
import { UpdatePolicyTemplateDto } from './dto/update-policy-template.dto';

@Injectable()
export class PolicyTemplateService {
  private readonly logger = new Logger(PolicyTemplateService.name);

  async findAll(take = 500, skip = 0) {
    return db.frameworkEditorPolicyTemplate.findMany({
      take,
      skip,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const pt = await db.frameworkEditorPolicyTemplate.findUnique({
      where: { id },
    });
    if (!pt) throw new NotFoundException(`Policy template ${id} not found`);
    return pt;
  }

  async create(dto: CreatePolicyTemplateDto) {
    const pt = await db.frameworkEditorPolicyTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        frequency: dto.frequency,
        department: dto.department,
        content: {},
      },
    });
    this.logger.log(`Created policy template: ${pt.name} (${pt.id})`);
    return pt;
  }

  async update(id: string, dto: UpdatePolicyTemplateDto) {
    await this.findById(id);
    const updated = await db.frameworkEditorPolicyTemplate.update({
      where: { id },
      data: dto,
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
    await db.frameworkEditorPolicyTemplate.delete({ where: { id } });
    this.logger.log(`Deleted policy template ${id}`);
    return { message: 'Policy template deleted successfully' };
  }
}
