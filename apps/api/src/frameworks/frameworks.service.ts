import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, type EvidenceFormType } from '@db';
import {
  getOverviewScores,
  getCurrentMember,
  computeFrameworkComplianceScore,
} from './frameworks-scores.helper';
import { upsertOrgFrameworkStructure } from './frameworks-upsert.helper';
import { createTimelinesForFrameworks } from './frameworks-timeline.helper';
import { TimelinesService } from '../timelines/timelines.service';
import type { FrameworkManifest } from './framework-versioning/manifest.types';
import { buildUpdatePreview } from './framework-versioning/framework-update-preview';

type RequirementDef = {
  id: string;
  name: string;
  identifier: string;
  description: string;
  frameworkId: string | null;
  customFrameworkId: string | null;
};

@Injectable()
export class FrameworksService {
  private readonly logger = new Logger(FrameworksService.name);

  constructor(private readonly timelinesService: TimelinesService) {}

  private async loadRequirementDefinitions(fi: {
    frameworkId: string | null;
    customFrameworkId: string | null;
    currentVersionId?: string | null;
  }): Promise<RequirementDef[]> {
    if (fi.customFrameworkId) {
      const rows = await db.customRequirement.findMany({
        where: { customFrameworkId: fi.customFrameworkId },
        orderBy: { name: 'asc' },
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        frameworkId: null,
        customFrameworkId: r.customFrameworkId,
      }));
    }
    if (fi.frameworkId) {
      // Prefer the pinned version's manifest so customers see exactly what
      // they're synced to — NOT the live template state which may have
      // additions not yet synced.
      if (fi.currentVersionId) {
        const version = await db.frameworkVersion.findUnique({
          where: { id: fi.currentVersionId },
          select: { manifest: true },
        });
        if (version) {
          const manifest = version.manifest as unknown as FrameworkManifest;
          return [...manifest.requirements]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => ({
              id: r.id,
              name: r.name,
              identifier: r.identifier,
              description: r.description ?? '',
              frameworkId: fi.frameworkId,
              customFrameworkId: null,
            }));
        }
      }
      // Fallback: instances with no pinned version (shouldn't happen post-backfill).
      const rows = await db.frameworkEditorRequirement.findMany({
        where: { frameworkId: fi.frameworkId },
        orderBy: { name: 'asc' },
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        frameworkId: r.frameworkId,
        customFrameworkId: null,
      }));
    }
    return [];
  }

  async findAll(
    organizationId: string,
    options?: { includeControls?: boolean; includeScores?: boolean },
  ) {
    const includeControls = options?.includeControls ?? false;
    const includeScores = options?.includeScores ?? false;

    const frameworkInstances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: {
        framework: true,
        customFramework: true,
        ...(includeControls && {
          requirementsMapped: {
            where: { archivedAt: null },
            include: {
              control: {
                include: {
                  policies: {
                    where: { archivedAt: null },
                    select: { id: true, name: true, status: true },
                  },
                  controlDocumentTypes: true,
                  requirementsMapped: { where: { archivedAt: null } },
                },
              },
            },
          },
        }),
      },
    });

    if (!includeControls) {
      return frameworkInstances;
    }

    const frameworksWithControls = frameworkInstances.map((fi: any) => {
      const controlsMap = new Map<string, any>();
      for (const rm of fi.requirementsMapped || []) {
        if (rm.control && !controlsMap.has(rm.control.id)) {
          const { requirementsMapped: _, ...controlData } = rm.control;
          controlsMap.set(rm.control.id, {
            ...controlData,
            policies: rm.control.policies || [],
            requirementsMapped: rm.control.requirementsMapped || [],
          });
        }
      }
      const { requirementsMapped: _, ...rest } = fi;
      return { ...rest, controls: Array.from(controlsMap.values()) };
    });

    if (!includeScores) {
      return frameworksWithControls;
    }

    const [tasks, evidenceSubmissions] = await Promise.all([
      db.task.findMany({
        where: {
          organizationId,
          archivedAt: null,
          controls: { some: { organizationId, archivedAt: null } },
        },
        include: { controls: { where: { archivedAt: null } } },
      }),
      db.evidenceSubmission.findMany({
        where: { organizationId },
        select: { formType: true, submittedAt: true },
      }),
    ]);

    return frameworksWithControls.map((fw: any) => ({
      ...fw,
      complianceScore: computeFrameworkComplianceScore(
        fw,
        tasks,
        evidenceSubmissions,
      ),
    }));
  }

  async findOne(frameworkInstanceId: string, organizationId: string) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      include: {
        framework: true,
        customFramework: true,
        requirementsMapped: {
          where: { archivedAt: null },
          include: {
            control: {
              include: {
                policies: {
                  where: { archivedAt: null },
                  select: { id: true, name: true, status: true },
                },
                requirementsMapped: { where: { archivedAt: null } },
                controlDocumentTypes: true,
              },
            },
          },
        },
      },
    });

    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    const controlsMap = new Map<string, any>();
    for (const rm of fi.requirementsMapped) {
      if (rm.control && !controlsMap.has(rm.control.id)) {
        const { requirementsMapped: _, ...controlData } = rm.control;
        controlsMap.set(rm.control.id, {
          ...controlData,
          policies: rm.control.policies || [],
          requirementsMapped: rm.control.requirementsMapped || [],
          controlDocumentTypes: rm.control.controlDocumentTypes || [],
        });
      }
    }
    const { requirementsMapped: _, ...rest } = fi;

    const allFormTypes = new Set<EvidenceFormType>();
    for (const control of controlsMap.values()) {
      for (const dt of control.controlDocumentTypes) {
        allFormTypes.add(dt.formType);
      }
    }

    const [requirementDefinitions, tasks, requirementMaps, evidenceSubmissions] =
      await Promise.all([
        this.loadRequirementDefinitions(fi),
        db.task.findMany({
          where: { organizationId, archivedAt: null, controls: { some: { organizationId, archivedAt: null } } },
          include: { controls: { where: { archivedAt: null } } },
        }),
        db.requirementMap.findMany({
          where: { frameworkInstanceId, archivedAt: null },
          include: { control: true },
        }),
        allFormTypes.size > 0
          ? db.evidenceSubmission.findMany({
              where: {
                organizationId,
                formType: { in: Array.from(allFormTypes) },
              },
              select: { id: true, formType: true, submittedAt: true },
              orderBy: { submittedAt: 'desc' },
            })
          : Promise.resolve([]),
      ]);

    return {
      ...rest,
      controls: Array.from(controlsMap.values()),
      requirementDefinitions,
      tasks,
      requirementMaps,
      evidenceSubmissions,
    };
  }

  async findAvailable(organizationId?: string) {
    const [platform, custom] = await Promise.all([
      db.frameworkEditorFramework.findMany({
        where: { visible: true },
        include: { requirements: true },
      }),
      organizationId
        ? db.customFramework.findMany({
            where: { organizationId },
            include: { requirements: true },
          })
        : Promise.resolve([]),
    ]);

    return [
      ...platform.map((f) => ({ ...f, isCustom: false as const })),
      ...custom.map((f) => ({ ...f, visible: true, isCustom: true as const })),
    ];
  }

  async createCustom(
    organizationId: string,
    input: { name: string; description: string; version?: string },
  ) {
    return db.$transaction(async (tx) => {
      const customFramework = await tx.customFramework.create({
        data: {
          name: input.name,
          description: input.description,
          version: input.version ?? '1.0.0',
          organizationId,
        },
      });

      const instance = await tx.frameworkInstance.create({
        data: { organizationId, customFrameworkId: customFramework.id },
        include: { framework: true, customFramework: true },
      });

      return instance;
    });
  }

  async createRequirement(
    frameworkInstanceId: string,
    organizationId: string,
    input: { name: string; identifier: string; description: string },
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { customFrameworkId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }
    if (!fi.customFrameworkId) {
      throw new BadRequestException(
        'Cannot add custom requirements to a platform framework',
      );
    }

    return db.customRequirement.create({
      data: {
        name: input.name,
        identifier: input.identifier,
        description: input.description,
        customFrameworkId: fi.customFrameworkId,
        organizationId,
      },
    });
  }

  async linkRequirements(
    frameworkInstanceId: string,
    organizationId: string,
    requirementIds: string[],
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { customFrameworkId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }
    if (!fi.customFrameworkId) {
      throw new BadRequestException(
        'Cannot link requirements into a platform framework',
      );
    }

    // Sources may come from either the platform editor table or this org's
    // custom requirements.
    const [platformSources, customSources] = await Promise.all([
      db.frameworkEditorRequirement.findMany({
        where: { id: { in: requirementIds } },
        select: { name: true, identifier: true, description: true },
      }),
      db.customRequirement.findMany({
        where: { id: { in: requirementIds }, organizationId },
        select: { name: true, identifier: true, description: true },
      }),
    ]);
    const sources = [...platformSources, ...customSources];
    if (sources.length === 0) {
      throw new BadRequestException('No valid requirements to link');
    }

    const existing = await db.customRequirement.findMany({
      where: {
        customFrameworkId: fi.customFrameworkId,
        identifier: { in: sources.map((r) => r.identifier) },
      },
      select: { identifier: true },
    });
    const existingIdentifiers = new Set(existing.map((r) => r.identifier));
    const toCreate = sources.filter(
      (r) => !existingIdentifiers.has(r.identifier),
    );
    if (toCreate.length === 0) {
      return { count: 0, requirements: [] };
    }

    const created = await db.customRequirement.createManyAndReturn({
      data: toCreate.map((r) => ({
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        customFrameworkId: fi.customFrameworkId!,
        organizationId,
      })),
    });

    return { count: created.length, requirements: created };
  }

  async linkControlsToRequirement(
    frameworkInstanceId: string,
    requirementKey: string,
    organizationId: string,
    controlIds: string[],
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { id: true, frameworkId: true, customFrameworkId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    let requirementKind: 'platform' | 'custom';
    if (fi.customFrameworkId) {
      const req = await db.customRequirement.findFirst({
        where: {
          id: requirementKey,
          customFrameworkId: fi.customFrameworkId,
          organizationId,
        },
        select: { id: true },
      });
      if (!req) throw new NotFoundException('Requirement not found');
      requirementKind = 'custom';
    } else if (fi.frameworkId) {
      const req = await db.frameworkEditorRequirement.findFirst({
        where: { id: requirementKey, frameworkId: fi.frameworkId },
        select: { id: true },
      });
      if (!req) throw new NotFoundException('Requirement not found');
      requirementKind = 'platform';
    } else {
      throw new NotFoundException('Requirement not found');
    }

    const controls = await db.control.findMany({
      where: { id: { in: controlIds }, organizationId, archivedAt: null },
      select: { id: true },
    });
    if (controls.length === 0) {
      throw new BadRequestException('No valid controls to link');
    }

    const result = await db.requirementMap.createMany({
      data: controls.map((c) => ({
        controlId: c.id,
        frameworkInstanceId,
        ...(requirementKind === 'custom'
          ? { customRequirementId: requirementKey }
          : { requirementId: requirementKey }),
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async getScores(organizationId: string, userId?: string) {
    const [scores, currentMember] = await Promise.all([
      getOverviewScores(organizationId),
      userId ? getCurrentMember(organizationId, userId) : Promise.resolve(null),
    ]);

    // checkAutoCompletePhases is driven from mutation hooks in
    // tasks/policies/people/findings/evidence-forms services (it also triggers
    // regression reconciliation via reconcileAutoPhasesForOrganization), so
    // the dashboard read path no longer needs to fire it on every call.
    return { ...scores, currentMember };
  }

  async addFrameworks(organizationId: string, frameworkIds: string[]) {
    const result = await db.$transaction(async (tx) => {
      const frameworks = await tx.frameworkEditorFramework.findMany({
        where: { id: { in: frameworkIds }, visible: true },
        include: { requirements: true },
      });

      if (frameworks.length === 0) {
        throw new BadRequestException(
          'No valid or visible frameworks found for the provided IDs.',
        );
      }

      const finalIds = frameworks.map((f) => f.id);

      await upsertOrgFrameworkStructure({
        organizationId,
        targetFrameworkEditorIds: finalIds,
        frameworkEditorFrameworks: frameworks,
        tx,
      });

      return { success: true, frameworksAdded: finalIds.length, finalIds };
    });

    // Auto-create timeline instances from templates for newly added
    // frameworks. Fire-and-forget so a timeline-creation failure never masks
    // the primary transaction's success — partial state (e.g. only one SOC 2
    // track created) is repaired on the next /timelines read because
    // ensureTimelinesExist now always calls backfill (idempotent per track).
    createTimelinesForFrameworks({
      organizationId,
      frameworkEditorIds: result.finalIds,
      timelinesService: this.timelinesService,
    }).catch((err) => {
      this.logger.warn('createTimelinesForFrameworks failed after framework add', err);
    });

    return { success: result.success, frameworksAdded: result.frameworksAdded };
  }

  async findRequirement(
    frameworkInstanceId: string,
    requirementKey: string,
    organizationId: string,
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { id: true, frameworkId: true, customFrameworkId: true, currentVersionId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    const allReqDefs = await this.loadRequirementDefinitions(fi);
    const requirement = allReqDefs.find((r) => r.id === requirementKey);
    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const [relatedControls, tasks] = await Promise.all([
      db.requirementMap.findMany({
        where: {
          frameworkInstanceId,
          archivedAt: null,
          ...(fi.customFrameworkId
            ? { customRequirementId: requirementKey }
            : { requirementId: requirementKey }),
        },
        include: {
          control: {
            include: {
              policies: {
                where: { archivedAt: null },
                select: { id: true, name: true, status: true },
              },
              controlDocumentTypes: true,
            },
          },
        },
      }),
      db.task.findMany({
        where: { organizationId, archivedAt: null },
        include: { controls: { where: { archivedAt: null } } },
      }),
    ]);

    const formTypes = new Set<EvidenceFormType>();
    for (const rc of relatedControls) {
      for (const dt of rc.control.controlDocumentTypes || []) {
        formTypes.add(dt.formType);
      }
    }

    const evidenceSubmissions =
      formTypes.size > 0
        ? await db.evidenceSubmission.findMany({
            where: {
              organizationId,
              formType: { in: Array.from(formTypes) },
            },
            select: { id: true, formType: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
          })
        : [];

    const siblingRequirements = allReqDefs
      .filter((r) => r.id !== requirementKey)
      .map((r) => ({ id: r.id, name: r.name }));

    return {
      requirement,
      relatedControls,
      tasks,
      evidenceSubmissions,
      siblingRequirements,
    };
  }

  async delete(frameworkInstanceId: string, organizationId: string) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
    });

    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }

    await db.frameworkInstance.delete({
      where: { id: frameworkInstanceId },
    });

    return { success: true };
  }

  async getUpdateStatus(params: {
    organizationId: string;
    frameworkInstanceId: string;
  }) {
    const instance = await db.frameworkInstance.findUnique({
      where: { id: params.frameworkInstanceId },
      include: { currentVersion: { select: { id: true, version: true } } },
    });
    if (!instance || instance.organizationId !== params.organizationId) {
      throw new NotFoundException('Framework instance not found');
    }
    if (!instance.frameworkId) {
      return { currentVersion: null, latestVersion: null, updateAvailable: false };
    }

    const latest = await db.frameworkVersion.findFirst({
      where: { frameworkId: instance.frameworkId },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, version: true, publishedAt: true, releaseNotes: true },
    });

    return {
      currentVersion: instance.currentVersion,
      latestVersion: latest,
      updateAvailable: latest !== null && latest.id !== instance.currentVersion?.id,
    };
  }

  async getUpdatePreview(params: {
    organizationId: string;
    frameworkInstanceId: string;
  }) {
    const instance = await db.frameworkInstance.findUnique({
      where: { id: params.frameworkInstanceId },
      include: { currentVersion: true },
    });
    if (!instance || instance.organizationId !== params.organizationId) {
      throw new NotFoundException('Framework instance not found');
    }
    if (!instance.currentVersion) {
      throw new BadRequestException('Instance is not on any version');
    }

    const latest = await db.frameworkVersion.findFirst({
      where: { frameworkId: instance.frameworkId! },
      orderBy: { publishedAt: 'desc' },
    });
    if (!latest || latest.id === instance.currentVersionId) {
      throw new NotFoundException('No update available');
    }

    const fromManifest = instance.currentVersion.manifest as unknown as FrameworkManifest;
    const toManifest = latest.manifest as unknown as FrameworkManifest;
    const templateControlIds = [
      ...new Set([
        ...fromManifest.controls.map((c) => c.id),
        ...toManifest.controls.map((c) => c.id),
      ]),
    ];
    const templatePolicyIds = [
      ...new Set([
        ...fromManifest.policies.map((p) => p.id),
        ...toManifest.policies.map((p) => p.id),
      ]),
    ];
    const templateTaskIds = [
      ...new Set([
        ...fromManifest.tasks.map((t) => t.id),
        ...toManifest.tasks.map((t) => t.id),
      ]),
    ];

    const [instanceControls, instancePolicies, instanceTasks] = await Promise.all([
      db.control.findMany({
        where: {
          organizationId: params.organizationId,
          controlTemplateId: { in: templateControlIds },
          archivedAt: null,
        },
      }),
      db.policy.findMany({
        where: {
          organizationId: params.organizationId,
          policyTemplateId: { in: templatePolicyIds },
          archivedAt: null,
        },
      }),
      db.task.findMany({
        where: {
          organizationId: params.organizationId,
          taskTemplateId: { in: templateTaskIds },
          archivedAt: null,
        },
      }),
    ]);

    return buildUpdatePreview({
      fromManifest,
      toManifest,
      instanceControls: instanceControls.map((c) => ({
        id: c.id,
        controlTemplateId: c.controlTemplateId,
        name: c.name,
        description: c.description,
      })),
      instanceTasks: instanceTasks.map((t) => ({
        id: t.id,
        taskTemplateId: t.taskTemplateId,
        title: t.title,
        description: t.description,
        frequency: t.frequency,
        department: t.department,
      })),
      instancePolicies: instancePolicies.map((p) => ({
        id: p.id,
        policyTemplateId: p.policyTemplateId,
        name: p.name,
        description: p.description,
        content: p.content,
        frequency: p.frequency,
        department: p.department,
        status: p.status,
      })),
      fromVersionLabel: { id: instance.currentVersion.id, version: instance.currentVersion.version },
      toVersionLabel: { id: latest.id, version: latest.version },
      releaseNotes: latest.releaseNotes,
    });
  }

  async getSyncHistory(params: {
    organizationId: string;
    frameworkInstanceId: string;
  }) {
    const instance = await db.frameworkInstance.findUnique({
      where: { id: params.frameworkInstanceId },
    });
    if (!instance || instance.organizationId !== params.organizationId) {
      throw new NotFoundException('Framework instance not found');
    }

    return db.frameworkSyncOperation.findMany({
      where: { frameworkInstanceId: params.frameworkInstanceId },
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        performedAt: true,
        performedById: true,
        rollbackExpiresAt: true,
        rolledBackByOperationId: true,
        fromVersion: { select: { id: true, version: true } },
        toVersion: { select: { id: true, version: true } },
        summary: true,
      },
    });
  }
}
