import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, EvidenceFormType, Prisma } from '@db';
import { CreateControlDto } from './dto/create-control.dto';
import { deduplicateById, deduplicateByFormType } from '../utils/deduplicate';
import { syncDirectLinksToCustomFrameworks } from './sync-custom-framework-links';

// A CustomRequirement is valid for a given FrameworkInstance when its parent
// matches: either it lives on the FI's CustomFramework, or it was attached
// directly to the FI itself (per-instance custom requirement on a platform
// framework). The CustomRequirement schema's CHECK enforces that exactly one
// of customFrameworkId / frameworkInstanceId is set.
function isCustomReqOnInstance(
  req: {
    customFrameworkId: string | null;
    frameworkInstanceId: string | null;
  },
  instance: { id: string; customFrameworkId: string | null },
): boolean {
  if (req.customFrameworkId) {
    return (
      instance.customFrameworkId !== null &&
      req.customFrameworkId === instance.customFrameworkId
    );
  }
  return req.frameworkInstanceId === instance.id;
}

const controlInclude = {
  policies: {
    where: { archivedAt: null },
    select: { status: true, id: true, name: true },
  },
  tasks: {
    where: { archivedAt: null },
    select: { id: true, title: true, status: true },
  },
  requirementsMapped: {
    where: { archivedAt: null },
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
      archivedAt: null,
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

  async findOne(
    controlId: string,
    organizationId: string,
    frameworkInstanceId?: string,
  ) {
    if (frameworkInstanceId) {
      return this.findOneForFramework(controlId, organizationId, frameworkInstanceId);
    }

    const control = await db.control.findUnique({
      where: { id: controlId, organizationId },
      include: {
        policies: { where: { archivedAt: null } },
        tasks: { where: { archivedAt: null } },
        controlDocumentTypes: true,
        requirementsMapped: {
          where: { archivedAt: null },
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

    const policies = control.policies || [];
    const tasks = control.tasks || [];
    const controlDocumentTypes = control.controlDocumentTypes || [];

    const formTypes = controlDocumentTypes.map(
      (d) => d.formType,
    );
    const notRelevantSettings =
      formTypes.length > 0
        ? await db.evidenceFormSetting.findMany({
            where: {
              organizationId,
              formType: { in: formTypes },
              isNotRelevant: true,
            },
            select: { formType: true },
          })
        : [];
    const notRelevantFormTypes = new Set(
      notRelevantSettings.map((setting) => setting.formType),
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
      policies,
      tasks,
      controlDocumentTypes: controlDocumentTypes.map(
        (documentType) => ({
          ...documentType,
          isNotRelevant: notRelevantFormTypes.has(documentType.formType),
        }),
      ),
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

  private async findOneForFramework(
    controlId: string,
    organizationId: string,
    frameworkInstanceId: string,
  ) {
    const fi = await this.ensureFrameworkInstance(frameworkInstanceId, organizationId);
    const isCustomFramework = fi.customFrameworkId !== null;
    const control = await db.control.findUnique({
      where: { id: controlId, organizationId },
      include: {
        policies: { where: { archivedAt: null } },
        tasks: { where: { archivedAt: null } },
        controlDocumentTypes: true,
        frameworkPolicyLinks: {
          where: {
            frameworkInstanceId,
            policy: { archivedAt: null },
          },
          include: { policy: true },
        },
        frameworkTaskLinks: {
          where: {
            frameworkInstanceId,
            task: { archivedAt: null },
          },
          include: { task: true },
        },
        frameworkDocumentLinks: {
          where: { frameworkInstanceId },
        },
        requirementsMapped: {
          where: { archivedAt: null },
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

    const frameworkPolicies = control.frameworkPolicyLinks.map((link) => link.policy);
    const frameworkTasks = control.frameworkTaskLinks.map((link) => link.task);
    const directPolicies = isCustomFramework ? (control.policies ?? []) : [];
    const directTasks = isCustomFramework ? (control.tasks ?? []) : [];
    const policies = deduplicateById([...frameworkPolicies, ...directPolicies]);
    const tasks = deduplicateById([...frameworkTasks, ...directTasks]);
    const directDocTypes = isCustomFramework ? control.controlDocumentTypes : [];
    const controlDocumentTypes = deduplicateByFormType([
      ...control.frameworkDocumentLinks,
      ...directDocTypes,
    ]);
    const formTypes = controlDocumentTypes.map((d) => d.formType);
    const notRelevantSettings =
      formTypes.length > 0
        ? await db.evidenceFormSetting.findMany({
            where: {
              organizationId,
              formType: { in: formTypes },
              isNotRelevant: true,
            },
            select: { formType: true },
          })
        : [];
    const notRelevantFormTypes = new Set(
      notRelevantSettings.map((setting) => setting.formType),
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

    const policyCompleted = policies.filter((p) => p.status === 'published').length;
    const taskCompleted = tasks.filter(
      (t) => t.status === 'done' || t.status === 'not_relevant',
    ).length;
    const completed = policyCompleted + taskCompleted;
    const totalItems = policies.length + tasks.length;

    const {
      frameworkPolicyLinks,
      frameworkTaskLinks,
      frameworkDocumentLinks,
      policies: _policies,
      tasks: _tasks,
      controlDocumentTypes: _controlDocumentTypes,
      ...controlData
    } = control;

    return {
      ...controlData,
      policies,
      tasks,
      controlDocumentTypes: controlDocumentTypes.map((documentType) => ({
        ...documentType,
        isNotRelevant: notRelevantFormTypes.has(documentType.formType),
      })),
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
        where: { organizationId, isArchived: false, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.task.findMany({
        where: { organizationId, archivedAt: null },
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

      if (scopedRequirementMappings.length > 0) {
        await syncDirectLinksToCustomFrameworks({
          controlId: control.id,
          organizationId,
          client: tx,
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
    // Exclude both user-archived (isArchived) and sync-archived (archivedAt)
    // policies. Checking only archivedAt would let user-archived policies
    // get re-linked to a control and surface back through the UI.
    const policies = await db.policy.findMany({
      where: {
        id: { in: uniqueIds },
        organizationId,
        archivedAt: null,
        isArchived: false,
      },
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
      where: { id: { in: uniqueIds }, organizationId, archivedAt: null },
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
            select: {
              id: true,
              customFrameworkId: true,
              frameworkInstanceId: true,
            },
          })
        : Promise.resolve<
            {
              id: string;
              customFrameworkId: string | null;
              frameworkInstanceId: string | null;
            }[]
          >([]),
    ]);
    const platformReqFwById = new Map(
      platformReqs.map((r) => [r.id, r.frameworkId]),
    );
    const customReqById = new Map(customReqs.map((r) => [r.id, r]));

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
        const req = customReqById.get(m.customRequirementId);
        if (!req || !isCustomReqOnInstance(req, instance)) {
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

  private async ensureFrameworkInstance(
    frameworkInstanceId: string,
    organizationId: string,
  ) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { id: true, customFrameworkId: true },
    });
    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }
    return frameworkInstance;
  }

  async linkPolicies(
    controlId: string,
    organizationId: string,
    policyIds: string[],
    frameworkInstanceId?: string,
  ) {
    await this.ensureControl(controlId, organizationId);

    const policies = await db.policy.findMany({
      where: { id: { in: policyIds }, organizationId, archivedAt: null },
      select: { id: true },
    });
    if (policies.length === 0) {
      throw new BadRequestException('No valid policies to link');
    }

    if (frameworkInstanceId) {
      await this.ensureFrameworkInstance(frameworkInstanceId, organizationId);
      await db.frameworkControlPolicyLink.createMany({
        data: policies.map((policy) => ({
          frameworkInstanceId,
          controlId,
          policyId: policy.id,
        })),
        skipDuplicates: true,
      });
    } else {
      await db.control.update({
        where: { id: controlId },
        data: { policies: { connect: policies.map((p) => ({ id: p.id })) } },
      });
      await syncDirectLinksToCustomFrameworks({ controlId, organizationId });
    }

    return { count: policies.length };
  }

  async linkTasks(
    controlId: string,
    organizationId: string,
    taskIds: string[],
    frameworkInstanceId?: string,
  ) {
    await this.ensureControl(controlId, organizationId);

    const tasks = await db.task.findMany({
      where: { id: { in: taskIds }, organizationId, archivedAt: null },
      select: { id: true },
    });
    if (tasks.length === 0) {
      throw new BadRequestException('No valid tasks to link');
    }

    if (frameworkInstanceId) {
      await this.ensureFrameworkInstance(frameworkInstanceId, organizationId);
      await db.frameworkControlTaskLink.createMany({
        data: tasks.map((task) => ({
          frameworkInstanceId,
          controlId,
          taskId: task.id,
        })),
        skipDuplicates: true,
      });
    } else {
      await db.control.update({
        where: { id: controlId },
        data: { tasks: { connect: tasks.map((t) => ({ id: t.id })) } },
      });
      await syncDirectLinksToCustomFrameworks({ controlId, organizationId });
    }

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
            select: {
              id: true,
              customFrameworkId: true,
              frameworkInstanceId: true,
            },
          })
        : Promise.resolve<
            {
              id: string;
              customFrameworkId: string | null;
              frameworkInstanceId: string | null;
            }[]
          >([]),
    ]);
    const platformReqFwById = new Map(
      platformReqs.map((r) => [r.id, r.frameworkId]),
    );
    const customReqById = new Map(customReqs.map((r) => [r.id, r]));

    const validMappings = mappings.filter((m) => {
      const instance = instanceById.get(m.frameworkInstanceId);
      if (!instance) return false;
      if (m.requirementId) {
        const reqFwId = platformReqFwById.get(m.requirementId);
        return Boolean(reqFwId) && reqFwId === instance.frameworkId;
      }
      if (m.customRequirementId) {
        const req = customReqById.get(m.customRequirementId);
        return Boolean(req) && isCustomReqOnInstance(req!, instance);
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
    frameworkInstanceId?: string,
  ) {
    await this.ensureControl(controlId, organizationId);
    if (frameworkInstanceId) {
      await this.ensureFrameworkInstance(frameworkInstanceId, organizationId);
      const result = await db.frameworkControlDocumentTypeLink.createMany({
        data: formTypes.map((formType) => ({
          frameworkInstanceId,
          controlId,
          formType,
        })),
        skipDuplicates: true,
      });
      return { count: result.count };
    }
    const result = await db.controlDocumentType.createMany({
      data: formTypes.map((formType) => ({ controlId, formType })),
      skipDuplicates: true,
    });
    await syncDirectLinksToCustomFrameworks({ controlId, organizationId });
    return { count: result.count };
  }

  async unlinkDocumentType(
    controlId: string,
    organizationId: string,
    formType: EvidenceFormType,
    frameworkInstanceId?: string,
  ) {
    await this.ensureControl(controlId, organizationId);
    if (frameworkInstanceId) {
      await this.ensureFrameworkInstance(frameworkInstanceId, organizationId);
      await db.frameworkControlDocumentTypeLink.deleteMany({
        where: { frameworkInstanceId, controlId, formType },
      });
      return { success: true };
    }
    const deleted = await db.controlDocumentType.deleteMany({
      where: { controlId, formType },
    });
    if (deleted.count === 0) return { success: true };
    const customFiIds = await db.requirementMap.findMany({
      where: {
        controlId,
        archivedAt: null,
        frameworkInstance: {
          organizationId,
          customFrameworkId: { not: null },
        },
      },
      select: { frameworkInstanceId: true },
      distinct: ['frameworkInstanceId'],
    });
    if (customFiIds.length > 0) {
      await db.frameworkControlDocumentTypeLink.deleteMany({
        where: {
          controlId,
          formType,
          frameworkInstanceId: {
            in: customFiIds.map((r) => r.frameworkInstanceId),
          },
        },
      });
    }
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
