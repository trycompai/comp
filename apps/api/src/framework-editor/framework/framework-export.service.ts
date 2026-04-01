import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { db, Prisma, EvidenceFormType } from '@db';
import type { ImportFrameworkDto } from './dto/import-framework.dto';

export interface ExportedFramework {
  version: string;
  exportedAt: string;
  framework: {
    name: string;
    version: string;
    description: string;
    visible: boolean;
  };
  requirements: Array<{
    name: string;
    identifier: string;
    description: string;
  }>;
  controlTemplates: Array<{
    name: string;
    description: string;
    documentTypes: string[];
    requirementIndices: number[];
    policyTemplateIndices: number[];
    taskTemplateIndices: number[];
  }>;
  policyTemplates: Array<{
    name: string;
    description: string;
    frequency: string;
    department: string;
    content: Record<string, unknown>;
  }>;
  taskTemplates: Array<{
    name: string;
    description: string;
    frequency: string;
    department: string;
    automationStatus: string;
  }>;
}

@Injectable()
export class FrameworkExportService {
  private readonly logger = new Logger(FrameworkExportService.name);

  async export(frameworkId: string): Promise<ExportedFramework> {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
    });

    if (!framework) {
      throw new NotFoundException(`Framework ${frameworkId} not found`);
    }

    const requirements = await db.frameworkEditorRequirement.findMany({
      where: { frameworkId },
      orderBy: { name: 'asc' },
    });

    const controlTemplates = await db.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { frameworkId } } },
      include: {
        requirements: { select: { id: true }, where: { frameworkId } },
        policyTemplates: { select: { id: true } },
        taskTemplates: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    const policyIds = new Set(
      controlTemplates.flatMap((ct) => ct.policyTemplates.map((p) => p.id)),
    );
    const taskIds = new Set(
      controlTemplates.flatMap((ct) => ct.taskTemplates.map((t) => t.id)),
    );

    const policyTemplates = await db.frameworkEditorPolicyTemplate.findMany({
      where: { id: { in: [...policyIds] } },
      orderBy: { name: 'asc' },
    });

    const taskTemplates = await db.frameworkEditorTaskTemplate.findMany({
      where: { id: { in: [...taskIds] } },
      orderBy: { name: 'asc' },
    });

    const reqIdToIndex = new Map(requirements.map((r, i) => [r.id, i]));
    const policyIdToIndex = new Map(policyTemplates.map((p, i) => [p.id, i]));
    const taskIdToIndex = new Map(taskTemplates.map((t, i) => [t.id, i]));

    this.logger.log(
      `Exporting framework "${framework.name}": ${requirements.length} requirements, ` +
        `${controlTemplates.length} controls, ${policyTemplates.length} policies, ` +
        `${taskTemplates.length} tasks`,
    );

    return {
      version: '1',
      exportedAt: new Date().toISOString(),
      framework: {
        name: framework.name,
        version: framework.version,
        description: framework.description,
        visible: framework.visible,
      },
      requirements: requirements.map((r) => ({
        name: r.name,
        identifier: r.identifier,
        description: r.description,
      })),
      controlTemplates: controlTemplates.map((ct) => ({
        name: ct.name,
        description: ct.description,
        documentTypes: ct.documentTypes as string[],
        requirementIndices: ct.requirements
          .map((r) => reqIdToIndex.get(r.id))
          .filter((i): i is number => i !== undefined),
        policyTemplateIndices: ct.policyTemplates
          .map((p) => policyIdToIndex.get(p.id))
          .filter((i): i is number => i !== undefined),
        taskTemplateIndices: ct.taskTemplates
          .map((t) => taskIdToIndex.get(t.id))
          .filter((i): i is number => i !== undefined),
      })),
      policyTemplates: policyTemplates.map((p) => ({
        name: p.name,
        description: p.description,
        frequency: p.frequency,
        department: p.department,
        content: p.content as Record<string, unknown>,
      })),
      taskTemplates: taskTemplates.map((t) => ({
        name: t.name,
        description: t.description,
        frequency: t.frequency,
        department: t.department,
        automationStatus: t.automationStatus,
      })),
    };
  }

  async import(dto: ImportFrameworkDto) {
    if (dto.version !== '1') {
      throw new BadRequestException(
        `Unsupported export version "${dto.version}". Expected "1".`,
      );
    }

    this.validateIndices(dto);

    return db.$transaction(async (tx) => {
      const framework = await tx.frameworkEditorFramework.create({
        data: {
          name: dto.framework.name,
          version: dto.framework.version,
          description: dto.framework.description,
          visible: dto.framework.visible ?? false,
        },
      });

      const createdRequirements = await Promise.all(
        (dto.requirements ?? []).map((r) =>
          tx.frameworkEditorRequirement.create({
            data: {
              frameworkId: framework.id,
              name: r.name,
              identifier: r.identifier ?? '',
              description: r.description,
            },
          }),
        ),
      );

      const createdPolicies = await Promise.all(
        (dto.policyTemplates ?? []).map((p) =>
          tx.frameworkEditorPolicyTemplate.create({
            data: {
              name: p.name,
              description: p.description,
              frequency: p.frequency,
              department: p.department,
              content: (p.content ?? {}) as Prisma.InputJsonValue,
            },
          }),
        ),
      );

      const createdTasks = await Promise.all(
        (dto.taskTemplates ?? []).map((t) =>
          tx.frameworkEditorTaskTemplate.create({
            data: {
              name: t.name,
              description: t.description,
              frequency: t.frequency,
              department: t.department,
              automationStatus: t.automationStatus,
            },
          }),
        ),
      );

      await Promise.all(
        (dto.controlTemplates ?? []).map((ct) =>
          tx.frameworkEditorControlTemplate.create({
            data: {
              name: ct.name,
              description: ct.description,
              documentTypes: (ct.documentTypes ?? []) as EvidenceFormType[],
              requirements: {
                connect: (ct.requirementIndices ?? []).map((i) => ({
                  id: createdRequirements[i].id,
                })),
              },
              policyTemplates: {
                connect: (ct.policyTemplateIndices ?? []).map((i) => ({
                  id: createdPolicies[i].id,
                })),
              },
              taskTemplates: {
                connect: (ct.taskTemplateIndices ?? []).map((i) => ({
                  id: createdTasks[i].id,
                })),
              },
            },
          }),
        ),
      );

      this.logger.log(
        `Imported framework "${framework.name}" (${framework.id}): ` +
          `${createdRequirements.length} requirements, ` +
          `${dto.controlTemplates?.length ?? 0} controls, ` +
          `${createdPolicies.length} policies, ${createdTasks.length} tasks`,
      );

      return framework;
    });
  }

  private validateIndices(dto: ImportFrameworkDto) {
    const reqCount = dto.requirements?.length ?? 0;
    const policyCount = dto.policyTemplates?.length ?? 0;
    const taskCount = dto.taskTemplates?.length ?? 0;

    for (const ct of dto.controlTemplates ?? []) {
      for (const i of ct.requirementIndices ?? []) {
        if (i < 0 || i >= reqCount) {
          throw new BadRequestException(
            `Control "${ct.name}" references requirement index ${i}, but only ${reqCount} requirements exist`,
          );
        }
      }
      for (const i of ct.policyTemplateIndices ?? []) {
        if (i < 0 || i >= policyCount) {
          throw new BadRequestException(
            `Control "${ct.name}" references policy template index ${i}, but only ${policyCount} policy templates exist`,
          );
        }
      }
      for (const i of ct.taskTemplateIndices ?? []) {
        if (i < 0 || i >= taskCount) {
          throw new BadRequestException(
            `Control "${ct.name}" references task template index ${i}, but only ${taskCount} task templates exist`,
          );
        }
      }
    }
  }
}
