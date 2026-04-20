import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, EvidenceFormType, Prisma } from '@db';
import { CreateControlDto } from './dto/create-control.dto';

const controlInclude = {
  policies: {
    select: { status: true, id: true, name: true },
  },
  tasks: {
    select: { id: true, title: true, status: true },
  },
  requirementsMapped: {
    include: {
      frameworkInstance: {
        include: { framework: true, customFramework: true },
      },
      requirement: {
        select: { name: true, identifier: true },
      },
      customRequirement: {
        select: { name: true, identifier: true },
      },
    },
  },
} satisfies Prisma.ControlInclude;

@Injectable()
export class ControlsService {
  async findAll(
    organizationId: string,
    options: {
      page: number;
      perPage: number;
      name?: string;
      sortBy?: string;
      sortDesc?: boolean;
    },
  ) {
    const where: Prisma.ControlWhereInput = {
      organizationId,
      ...(options.name && {
        name: { contains: options.name, mode: Prisma.QueryMode.insensitive },
      }),
    };

    const orderBy: any = options.sortBy
      ? { [options.sortBy]: options.sortDesc ? 'desc' : 'asc' }
      : { name: 'asc' };

    const [controls, total] = await Promise.all([
      db.control.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.perPage,
        take: options.perPage,
        include: controlInclude,
      }),
      db.control.count({ where }),
    ]);

    return {
      data: controls,
      pageCount: Math.ceil(total / options.perPage),
    };
  }

  async findOne(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: { id: controlId, organizationId },
      include: {
        policies: true,
        tasks: true,
        controlDocumentTypes: true,
        requirementsMapped: {
          include: {
            frameworkInstance: {
              include: { framework: true, customFramework: true },
            },
            requirement: true,
            customRequirement: true,
          },
        },
      },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    const formTypes = (control.controlDocumentTypes ?? []).map(
      (d) => d.formType,
    );
    const submissionCountsByFormType: Record<string, number> = {};
    if (formTypes.length > 0) {
      const grouped = await db.evidenceSubmission.groupBy({
        by: ['formType'],
        where: {
          organizationId,
          formType: { in: formTypes },
        },
        _count: { _all: true },
      });
      for (const g of grouped) {
        submissionCountsByFormType[g.formType] = g._count._all;
      }
    }

    // Compute progress
    const policies = control.policies || [];
    const tasks = control.tasks || [];
    const totalItems = policies.length + tasks.length;

    let policyCompleted = 0;
    let taskCompleted = 0;

    for (const p of policies) {
      if (p.status === 'published') policyCompleted++;
    }
    for (const t of tasks) {
      if (t.status === 'done' || t.status === 'not_relevant') taskCompleted++;
    }

    const completed = policyCompleted + taskCompleted;

    return {
      ...control,
      submissionCountsByFormType,
      progress: {
        total: totalItems,
        completed,
        progress:
          totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
        byType: {
          policy: { total: policies.length, completed: policyCompleted },
          task: { total: tasks.length, completed: taskCompleted },
        },
      },
    };
  }

  async getOptions(organizationId: string) {
    const [policies, tasks, frameworkInstances] = await Promise.all([
      db.policy.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.task.findMany({
        where: { organizationId },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      }),
      db.frameworkInstance.findMany({
        where: { organizationId },
        include: {
          framework: {
            include: {
              requirements: {
                select: { id: true, name: true, identifier: true },
              },
            },
          },
          customFramework: {
            include: {
              requirements: {
                select: { id: true, name: true, identifier: true },
              },
            },
          },
        },
      }),
    ]);

    type RequirementOption = {
      id: string;
      name: string;
      identifier: string;
      frameworkInstanceId: string;
      frameworkName: string;
      isCustom: boolean;
      requirementId?: string;
      customRequirementId?: string;
    };
    const requirements: RequirementOption[] = [];
    for (const fi of frameworkInstances) {
      if (fi.customFramework) {
        for (const req of fi.customFramework.requirements) {
          requirements.push({
            id: req.id,
            name: req.name,
            identifier: req.identifier,
            customRequirementId: req.id,
            frameworkInstanceId: fi.id,
            frameworkName: fi.customFramework.name,
            isCustom: true,
          });
        }
      } else if (fi.framework) {
        for (const req of fi.framework.requirements) {
          requirements.push({
            id: req.id,
            name: req.name,
            identifier: req.identifier,
            requirementId: req.id,
            frameworkInstanceId: fi.id,
            frameworkName: fi.framework.name,
            isCustom: false,
          });
        }
      }
    }

    return { policies, tasks, requirements };
  }

  async create(organizationId: string, dto: CreateControlDto) {
    const {
      name,
      description,
      policyIds,
      taskIds,
      requirementMappings,
      documentTypes,
    } = dto;

    for (const m of requirementMappings ?? []) {
      const hasPlatform = Boolean(m.requirementId);
      const hasCustom = Boolean(m.customRequirementId);
      if (hasPlatform === hasCustom) {
        throw new BadRequestException(
          'Each requirement mapping must set exactly one of requirementId or customRequirementId',
        );
      }
    }

    // Scope every FK supplied by the client to the caller's org before trusting
    // it. Prisma FKs only check row existence, not tenancy.
    const scopedPolicyIds = await this.validatePolicyIds(
      policyIds,
      organizationId,
    );
    const scopedTaskIds = await this.validateTaskIds(taskIds, organizationId);
    const scopedRequirementMappings = await this.validateRequirementMappings(
      requirementMappings,
      organizationId,
    );

    return db.$transaction(async (tx) => {
      const control = await tx.control.create({
        data: {
          name,
          description,
          organizationId,
          ...(scopedPolicyIds.length > 0 && {
            policies: {
              connect: scopedPolicyIds.map((id) => ({ id })),
            },
          }),
          ...(scopedTaskIds.length > 0 && {
            tasks: {
              connect: scopedTaskIds.map((id) => ({ id })),
            },
          }),
        },
      });

      if (scopedRequirementMappings.length > 0) {
        await tx.requirementMap.createMany({
          data: scopedRequirementMappings.map((mapping) => ({
            controlId: control.id,
            frameworkInstanceId: mapping.frameworkInstanceId,
            requirementId: mapping.requirementId ?? null,
            customRequirementId: mapping.customRequirementId ?? null,
          })),
          skipDuplicates: true,
        });
      }

      if (documentTypes && documentTypes.length > 0) {
        await tx.controlDocumentType.createMany({
          data: documentTypes.map((formType) => ({
            controlId: control.id,
            formType,
          })),
          skipDuplicates: true,
        });
      }

      return control;
    });
  }

  private async validatePolicyIds(
    policyIds: string[] | undefined,
    organizationId: string,
  ): Promise<string[]> {
    if (!policyIds || policyIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(policyIds));
    const policies = await db.policy.findMany({
      where: { id: { in: uniqueIds }, organizationId },
      select: { id: true },
    });
    if (policies.length !== uniqueIds.length) {
      throw new BadRequestException('One or more policies are invalid');
    }
    return policies.map((p) => p.id);
  }

  private async validateTaskIds(
    taskIds: string[] | undefined,
    organizationId: string,
  ): Promise<string[]> {
    if (!taskIds || taskIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(taskIds));
    const tasks = await db.task.findMany({
      where: { id: { in: uniqueIds }, organizationId },
      select: { id: true },
    });
    if (tasks.length !== uniqueIds.length) {
      throw new BadRequestException('One or more tasks are invalid');
    }
    return tasks.map((t) => t.id);
  }

  private async validateRequirementMappings(
    mappings:
      | {
          requirementId?: string;
          customRequirementId?: string;
          frameworkInstanceId: string;
        }[]
      | undefined,
    organizationId: string,
  ) {
    if (!mappings || mappings.length === 0) return [];

    const frameworkInstanceIds = Array.from(
      new Set(mappings.map((m) => m.frameworkInstanceId)),
    );
    const instances = await db.frameworkInstance.findMany({
      where: { id: { in: frameworkInstanceIds }, organizationId },
      select: { id: true, frameworkId: true, customFrameworkId: true },
    });
    const instanceById = new Map(instances.map((i) => [i.id, i]));
    if (instances.length !== frameworkInstanceIds.length) {
      throw new BadRequestException(
        'One or more framework instances are invalid',
      );
    }

    const platformReqIds = mappings
      .map((m) => m.requirementId)
      .filter((id): id is string => Boolean(id));
    const customReqIds = mappings
      .map((m) => m.customRequirementId)
      .filter((id): id is string => Boolean(id));

    const [platformReqs, customReqs] = await Promise.all([
      platformReqIds.length > 0
        ? db.frameworkEditorRequirement.findMany({
            where: { id: { in: platformReqIds } },
            select: { id: true, frameworkId: true },
          })
        : Promise.resolve<{ id: string; frameworkId: string }[]>([]),
      customReqIds.length > 0
        ? db.customRequirement.findMany({
            where: { id: { in: customReqIds }, organizationId },
            select: { id: true, customFrameworkId: true },
          })
        : Promise.resolve<{ id: string; customFrameworkId: string }[]>([]),
    ]);
    const platformReqFwById = new Map(
      platformReqs.map((r) => [r.id, r.frameworkId]),
    );
    const customReqFwById = new Map(
      customReqs.map((r) => [r.id, r.customFrameworkId]),
    );

    for (const m of mappings) {
      const instance = instanceById.get(m.frameworkInstanceId);
      if (!instance) {
        throw new BadRequestException(
          'One or more framework instances are invalid',
        );
      }
      if (m.requirementId) {
        const reqFwId = platformReqFwById.get(m.requirementId);
        if (!reqFwId || reqFwId !== instance.frameworkId) {
          throw new BadRequestException(
            'One or more requirement mappings are invalid',
          );
        }
      } else if (m.customRequirementId) {
        const reqFwId = customReqFwById.get(m.customRequirementId);
        if (!reqFwId || reqFwId !== instance.customFrameworkId) {
          throw new BadRequestException(
            'One or more requirement mappings are invalid',
          );
        }
      }
    }

    return mappings;
  }

  private async ensureControl(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: { id: controlId, organizationId },
      select: { id: true },
    });
    if (!control) {
      throw new NotFoundException('Control not found');
    }
    return control;
  }

  async linkPolicies(
    controlId: string,
    organizationId: string,
    policyIds: string[],
  ) {
    await this.ensureControl(controlId, organizationId);

    const policies = await db.policy.findMany({
      where: { id: { in: policyIds }, organizationId },
      select: { id: true },
    });
    if (policies.length === 0) {
      throw new BadRequestException('No valid policies to link');
    }

    await db.control.update({
      where: { id: controlId },
      data: { policies: { connect: policies.map((p) => ({ id: p.id })) } },
    });

    return { count: policies.length };
  }

  async linkTasks(
    controlId: string,
    organizationId: string,
    taskIds: string[],
  ) {
    await this.ensureControl(controlId, organizationId);

    const tasks = await db.task.findMany({
      where: { id: { in: taskIds }, organizationId },
      select: { id: true },
    });
    if (tasks.length === 0) {
      throw new BadRequestException('No valid tasks to link');
    }

    await db.control.update({
      where: { id: controlId },
      data: { tasks: { connect: tasks.map((t) => ({ id: t.id })) } },
    });

    return { count: tasks.length };
  }

  async linkRequirements(
    controlId: string,
    organizationId: string,
    mappings: {
      requirementId?: string;
      customRequirementId?: string;
      frameworkInstanceId: string;
    }[],
  ) {
    await this.ensureControl(controlId, organizationId);

    for (const m of mappings) {
      const hasPlatform = Boolean(m.requirementId);
      const hasCustom = Boolean(m.customRequirementId);
      if (hasPlatform === hasCustom) {
        throw new BadRequestException(
          'Each mapping must set exactly one of requirementId or customRequirementId',
        );
      }
    }

    const frameworkInstanceIds = Array.from(
      new Set(mappings.map((m) => m.frameworkInstanceId)),
    );
    const instances = await db.frameworkInstance.findMany({
      where: { id: { in: frameworkInstanceIds }, organizationId },
      select: { id: true, frameworkId: true, customFrameworkId: true },
    });
    const instanceById = new Map(instances.map((i) => [i.id, i]));

    const platformReqIds = mappings
      .map((m) => m.requirementId)
      .filter((id): id is string => Boolean(id));
    const customReqIds = mappings
      .map((m) => m.customRequirementId)
      .filter((id): id is string => Boolean(id));

    const [platformReqs, customReqs] = await Promise.all([
      platformReqIds.length > 0
        ? db.frameworkEditorRequirement.findMany({
            where: { id: { in: platformReqIds } },
            select: { id: true, frameworkId: true },
          })
        : Promise.resolve<{ id: string; frameworkId: string }[]>([]),
      customReqIds.length > 0
        ? db.customRequirement.findMany({
            where: { id: { in: customReqIds }, organizationId },
            select: { id: true, customFrameworkId: true },
          })
        : Promise.resolve<{ id: string; customFrameworkId: string }[]>([]),
    ]);
    const platformReqFwById = new Map(
      platformReqs.map((r) => [r.id, r.frameworkId]),
    );
    const customReqFwById = new Map(
      customReqs.map((r) => [r.id, r.customFrameworkId]),
    );

    const validMappings = mappings.filter((m) => {
      const instance = instanceById.get(m.frameworkInstanceId);
      if (!instance) return false;
      if (m.requirementId) {
        const reqFwId = platformReqFwById.get(m.requirementId);
        return Boolean(reqFwId) && reqFwId === instance.frameworkId;
      }
      if (m.customRequirementId) {
        const reqFwId = customReqFwById.get(m.customRequirementId);
        return Boolean(reqFwId) && reqFwId === instance.customFrameworkId;
      }
      return false;
    });

    if (validMappings.length === 0) {
      throw new BadRequestException('No valid requirements to link');
    }

    const result = await db.requirementMap.createMany({
      data: validMappings.map((m) => ({
        controlId,
        frameworkInstanceId: m.frameworkInstanceId,
        requirementId: m.requirementId ?? null,
        customRequirementId: m.customRequirementId ?? null,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async linkDocumentTypes(
    controlId: string,
    organizationId: string,
    formTypes: EvidenceFormType[],
  ) {
    await this.ensureControl(controlId, organizationId);
    const result = await db.controlDocumentType.createMany({
      data: formTypes.map((formType) => ({ controlId, formType })),
      skipDuplicates: true,
    });
    return { count: result.count };
  }

  async unlinkDocumentType(
    controlId: string,
    organizationId: string,
    formType: EvidenceFormType,
  ) {
    await this.ensureControl(controlId, organizationId);
    await db.controlDocumentType.deleteMany({
      where: { controlId, formType },
    });
    return { success: true };
  }

  async delete(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: {
        id: controlId,
        organizationId,
      },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    await db.control.delete({
      where: { id: controlId },
    });

    return { success: true };
  }
}
