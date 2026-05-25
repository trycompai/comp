import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, type EvidenceFormType } from '@db';
import { deduplicateById, deduplicateByFormType } from '../utils/deduplicate';
import { syncDirectLinksToCustomFrameworks } from '../controls/sync-custom-framework-links';

import { tasks } from '@trigger.dev/sdk';
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
import type { updatePolicy } from '../trigger/policies/update-policy';

type RequirementDef = {
  id: string;
  name: string;
  identifier: string;
  description: string;
  frameworkId: string | null;
  customFrameworkId: string | null;
  // Discriminator that survives the per-instance custom case (where both
  // frameworkId and customFrameworkId are null on the def). Used by callers
  // to decide which RequirementMap FK column to filter on.
  kind: 'platform' | 'custom';
};

function mergeControlLinks(
  control: {
    id: string;
    frameworkPolicyLinks: { policy: { id: string; name: string; status: string } }[];
    frameworkDocumentLinks: { formType: EvidenceFormType }[];
    policies: { id: string; name: string; status: string }[];
    controlDocumentTypes: { formType: EvidenceFormType }[];
    [key: string]: unknown;
  },
  opts: {
    isCustomFramework: boolean;
    frameworkInstanceId: string;
    notRelevantFormTypes: Set<EvidenceFormType>;
  },
) {
  const {
    frameworkPolicyLinks,
    frameworkDocumentLinks,
    policies: directPolicies,
    controlDocumentTypes: directDocTypes,
    ...rest
  } = control;
  const frameworkPolicies = frameworkPolicyLinks.map((link) => link.policy);
  const extraPolicies = opts.isCustomFramework ? directPolicies : [];
  const extraDocTypes = opts.isCustomFramework
    ? directDocTypes.map((d) => ({
        ...d,
        frameworkInstanceId: opts.frameworkInstanceId,
        controlId: control.id,
      }))
    : [];
  return {
    ...rest,
    policies: deduplicateById([...frameworkPolicies, ...extraPolicies]),
    controlDocumentTypes: deduplicateByFormType([
      ...(frameworkDocumentLinks || []),
      ...extraDocTypes,
    ]).map((documentType) => ({
      ...documentType,
      isNotRelevant: opts.notRelevantFormTypes.has(documentType.formType),
    })),
  };
}

@Injectable()
export class FrameworksService {
  private readonly logger = new Logger(FrameworksService.name);

  constructor(private readonly timelinesService: TimelinesService) {}

  private async getNotRelevantFormTypes(
    organizationId: string,
  ): Promise<Set<EvidenceFormType>> {
    const settings = await db.evidenceFormSetting.findMany({
      where: { organizationId, isNotRelevant: true },
      select: { formType: true },
    });

    return new Set(settings.map((setting) => setting.formType));
  }

  private async loadRequirementDefinitions(fi: {
    id?: string;
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
        kind: 'custom',
      }));
    }
    if (fi.frameworkId) {
      // Per-instance custom requirements (org tacked an extra requirement
      // onto a platform framework). Always merged in alongside the platform
      // requirements, regardless of whether we read from the pinned version
      // manifest or the editor table fallback.
      const customRows = fi.id
        ? await db.customRequirement.findMany({
            where: { frameworkInstanceId: fi.id },
            orderBy: { name: 'asc' },
          })
        : [];
      const customDefs: RequirementDef[] = customRows.map((r) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        frameworkId: null,
        customFrameworkId: null,
        kind: 'custom',
      }));

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
          const platformDefs: RequirementDef[] = [...manifest.requirements].map(
            (r) => ({
              id: r.id,
              name: r.name,
              identifier: r.identifier,
              description: r.description ?? '',
              frameworkId: fi.frameworkId,
              customFrameworkId: null,
              kind: 'platform',
            }),
          );
          return [...platformDefs, ...customDefs].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }
      }
      // Fallback: instances with no pinned version (shouldn't happen post-backfill).
      const rows = await db.frameworkEditorRequirement.findMany({
        where: { frameworkId: fi.frameworkId },
        orderBy: { name: 'asc' },
      });
      const platformDefs: RequirementDef[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        frameworkId: r.frameworkId,
        customFrameworkId: null,
        kind: 'platform',
      }));
      return [...platformDefs, ...customDefs].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
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
                  frameworkPolicyLinks: {
                    where: { policy: { archivedAt: null } },
                    include: {
                      policy: {
                        select: { id: true, name: true, status: true },
                      },
                    },
                  },
                  frameworkDocumentLinks: true,
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

    const notRelevantFormTypes =
      await this.getNotRelevantFormTypes(organizationId);

    const frameworksWithControls = frameworkInstances.map((fi: any) => {
      const isCustomFramework = fi.customFrameworkId !== null;
      const controlsMap = new Map<string, any>();
      for (const rm of fi.requirementsMapped || []) {
        if (rm.control && !controlsMap.has(rm.control.id)) {
          const { requirementsMapped: _reqs, ...controlForMerge } = rm.control;
          const scopedControl = {
            ...controlForMerge,
            frameworkPolicyLinks: controlForMerge.frameworkPolicyLinks.filter(
              (link: { frameworkInstanceId: string }) =>
                link.frameworkInstanceId === fi.id,
            ),
            frameworkDocumentLinks: controlForMerge.frameworkDocumentLinks.filter(
              (link: { frameworkInstanceId: string }) =>
                link.frameworkInstanceId === fi.id,
            ),
          };
          const merged = mergeControlLinks(scopedControl, {
            isCustomFramework,
            frameworkInstanceId: fi.id,
            notRelevantFormTypes,
          });
          controlsMap.set(rm.control.id, {
            ...merged,
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

    const hasCustomFrameworks = frameworkInstances.some(
      (fi: any) => fi.customFrameworkId !== null,
    );
    const allControlIds = hasCustomFrameworks
      ? [
          ...new Set(
            frameworksWithControls.flatMap((fw: any) =>
              fw.controls.map((c: any) => c.id),
            ),
          ),
        ]
      : [];

    const [frameworkTasks, directTasks, evidenceSubmissions] = await Promise.all(
      [
        db.task.findMany({
          where: {
            organizationId,
            archivedAt: null,
            frameworkControlLinks: {
              some: { frameworkInstance: { organizationId } },
            },
          },
          include: {
            frameworkControlLinks: {
              where: { frameworkInstance: { organizationId } },
              include: { control: true },
            },
          },
        }),
        hasCustomFrameworks && allControlIds.length > 0
          ? db.task.findMany({
              where: {
                organizationId,
                archivedAt: null,
                controls: {
                  some: { id: { in: allControlIds as string[] } },
                },
              },
              include: {
                controls: {
                  where: { id: { in: allControlIds as string[] } },
                },
              },
            })
          : Promise.resolve([]),
        db.evidenceSubmission.findMany({
          where: { organizationId },
          select: { formType: true, submittedAt: true },
        }),
      ],
    );

    return frameworksWithControls.map((fw: any) => {
      const isCustomFw = fw.customFrameworkId !== null;
      const fwControlIds = new Set(fw.controls.map((c: any) => c.id));
      const mappedFrameworkTasks = frameworkTasks.map(
        ({ frameworkControlLinks, ...task }) => ({
          ...task,
          controls: frameworkControlLinks
            .filter((link) => link.frameworkInstanceId === fw.id)
            .map((link) => link.control),
        }),
      );
      const mappedDirectTasks = isCustomFw
        ? directTasks.map(({ controls, ...task }: (typeof directTasks)[number]) => ({
            ...task,
            controls: (controls as any[]).filter((c) => fwControlIds.has(c.id)),
          }))
        : [];
      const allTasks = deduplicateById([
        ...mappedFrameworkTasks,
        ...mappedDirectTasks,
      ]).filter((t) => t.controls.length > 0);

      return {
        ...fw,
        complianceScore: computeFrameworkComplianceScore(
          fw,
          allTasks,
          evidenceSubmissions,
        ),
      };
    });
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
                controlDocumentTypes: true,
                frameworkPolicyLinks: {
                  where: {
                    frameworkInstanceId,
                    policy: { archivedAt: null },
                  },
                  include: {
                    policy: {
                      select: { id: true, name: true, status: true },
                    },
                  },
                },
                requirementsMapped: { where: { archivedAt: null } },
                frameworkDocumentLinks: {
                  where: { frameworkInstanceId },
                },
              },
            },
          },
        },
      },
    });

    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    const isCustomFramework = fi.customFrameworkId !== null;
    const notRelevantFormTypes =
      await this.getNotRelevantFormTypes(organizationId);

    const mergeOpts = { isCustomFramework, frameworkInstanceId, notRelevantFormTypes };
    const controlsMap = new Map<string, any>();
    for (const rm of fi.requirementsMapped) {
      if (rm.control && !controlsMap.has(rm.control.id)) {
        const { requirementsMapped: _reqs, ...controlForMerge } = rm.control;
        const merged = mergeControlLinks(controlForMerge, mergeOpts);
        controlsMap.set(rm.control.id, {
          ...merged,
          requirementsMapped: rm.control.requirementsMapped || [],
        });
      }
    }
    const { requirementsMapped: _, ...rest } = fi;

    const allFormTypes = new Set<EvidenceFormType>();
    for (const control of controlsMap.values()) {
      for (const dt of control.controlDocumentTypes) {
        if (dt.isNotRelevant === true) continue;
        allFormTypes.add(dt.formType);
      }
    }

    const controlIds = Array.from(controlsMap.keys());
    const [
      requirementDefinitions,
      frameworkTasks,
      directTasks,
      requirementMaps,
      evidenceSubmissions,
    ] = await Promise.all([
      this.loadRequirementDefinitions(fi),
      db.task.findMany({
        where: {
          organizationId,
          archivedAt: null,
          frameworkControlLinks: { some: { frameworkInstanceId } },
        },
        include: {
          frameworkControlLinks: {
            where: { frameworkInstanceId },
            include: { control: true },
          },
        },
      }),
      isCustomFramework && controlIds.length > 0
        ? db.task.findMany({
            where: {
              organizationId,
              archivedAt: null,
              controls: { some: { id: { in: controlIds } } },
            },
            include: {
              controls: {
                where: { id: { in: controlIds } },
              },
            },
          })
        : Promise.resolve([]),
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

    const mappedFrameworkTasks = frameworkTasks.map(
      ({ frameworkControlLinks, ...task }) => ({
        ...task,
        controls: frameworkControlLinks.map((link) => link.control),
      }),
    );
    const mappedDirectTasks = directTasks.map(
      ({ controls, ...task }: (typeof directTasks)[number]) => ({
        ...task,
        controls,
      }),
    );
    const allTasks = deduplicateById([
      ...mappedFrameworkTasks,
      ...mappedDirectTasks,
    ]);

    return {
      ...rest,
      controls: Array.from(controlsMap.values()),
      requirementDefinitions,
      tasks: allTasks,
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
      select: { id: true, customFrameworkId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    // For an FI backed by a CustomFramework, the requirement attaches to the
    // framework so it travels with any future instances. For a platform FI
    // (e.g. ISO 27001) there's no per-org framework to hang it off, so it
    // attaches to the instance directly. The DB CHECK enforces exactly one.
    return db.customRequirement.create({
      data: {
        name: input.name,
        identifier: input.identifier,
        description: input.description,
        organizationId,
        ...(fi.customFrameworkId
          ? { customFrameworkId: fi.customFrameworkId }
          : { frameworkInstanceId: fi.id }),
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
      select: { id: true, customFrameworkId: true },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
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

    // Identifier dedupe is parent-scoped: a custom-framework instance dedupes
    // against the framework, a platform instance dedupes against the instance.
    const existing = await db.customRequirement.findMany({
      where: {
        ...(fi.customFrameworkId
          ? { customFrameworkId: fi.customFrameworkId }
          : { frameworkInstanceId: fi.id }),
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

    const parentFields = fi.customFrameworkId
      ? { customFrameworkId: fi.customFrameworkId }
      : { frameworkInstanceId: fi.id };

    const created = await db.customRequirement.createManyAndReturn({
      data: toCreate.map((r) => ({
        name: r.name,
        identifier: r.identifier,
        description: r.description,
        organizationId,
        ...parentFields,
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

    // The requirement may be:
    //   - a CustomRequirement on this FI's CustomFramework, or
    //   - a CustomRequirement attached directly to this FI (per-instance), or
    //   - a platform FrameworkEditorRequirement on this FI's framework.
    let requirementKind: 'platform' | 'custom';
    const customReq = await db.customRequirement.findFirst({
      where: {
        id: requirementKey,
        organizationId,
        OR: [
          ...(fi.customFrameworkId
            ? [{ customFrameworkId: fi.customFrameworkId }]
            : []),
          { frameworkInstanceId: fi.id },
        ],
      },
      select: { id: true },
    });
    if (customReq) {
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

    if (fi.customFrameworkId) {
      await Promise.all(
        controls.map((c) =>
          syncDirectLinksToCustomFrameworks({
            controlId: c.id,
            organizationId,
          }),
        ),
      );
    }

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

  async addFrameworks(
    organizationId: string,
    frameworkIds: string[],
    memberId?: string,
  ) {
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

      const upsertResult = await upsertOrgFrameworkStructure({
        organizationId,
        targetFrameworkEditorIds: finalIds,
        frameworkEditorFrameworks: frameworks,
        tx,
      });

      return {
        success: true,
        frameworksAdded: finalIds.length,
        finalIds,
        createdPolicyIds: upsertResult.createdPolicyIds,
      };
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
      this.logger.warn(
        'createTimelinesForFrameworks failed after framework add',
        err,
      );
    });

    // Regenerate only newly created policies so placeholder replacement runs
    // without touching customer-edited existing policies.
    if (result.createdPolicyIds.length > 0) {
      this.enqueuePolicyGenerationForNewPolicies({
        organizationId,
        policyIds: result.createdPolicyIds,
        memberId,
      }).catch((err) => {
        this.logger.warn(
          'enqueuePolicyGenerationForNewPolicies failed after framework add',
          err,
        );
      });
    }

    return { success: result.success, frameworksAdded: result.frameworksAdded };
  }

  private async enqueuePolicyGenerationForNewPolicies({
    organizationId,
    policyIds,
    memberId,
  }: {
    organizationId: string;
    policyIds: string[];
    memberId?: string;
  }) {
    const [instances, contextEntries] = await Promise.all([
      db.frameworkInstance.findMany({
        where: { organizationId },
        include: { framework: true, customFramework: true },
      }),
      db.context.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const normalized = instances.map((fi) => {
      if (fi.framework) {
        return {
          id: fi.framework.id,
          name: fi.framework.name,
          version: fi.framework.version,
          description: fi.framework.description,
          visible: fi.framework.visible,
          createdAt: fi.framework.createdAt,
          updatedAt: fi.framework.updatedAt,
        };
      }
      if (fi.customFramework) {
        return {
          id: fi.customFramework.id,
          name: fi.customFramework.name,
          version: fi.customFramework.version,
          description: fi.customFramework.description,
          visible: true,
          createdAt: fi.customFramework.createdAt,
          updatedAt: fi.customFramework.updatedAt,
        };
      }
      return null;
    });
    const uniqueFrameworks = Array.from(
      new Map(
        normalized
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .map((f) => [f.id, f]),
      ).values(),
    );

    const contextHub = contextEntries
      .map((c) => `${c.question}\n${c.answer}`)
      .join('\n');

    const triggerResults = await Promise.allSettled(
      policyIds.map((policyId) =>
        tasks.trigger<typeof updatePolicy>('update-policy', {
          organizationId,
          policyId,
          contextHub,
          frameworks: uniqueFrameworks,
          memberId,
        }),
      ),
    );

    const failedTrigger = triggerResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failedTrigger) {
      this.logger.error('Failed to trigger policy update', failedTrigger.reason);
      throw new Error('Failed to trigger policy update');
    }
  }

  async findRequirement(
    frameworkInstanceId: string,
    requirementKey: string,
    organizationId: string,
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: {
        id: true,
        frameworkId: true,
        customFrameworkId: true,
        currentVersionId: true,
      },
    });
    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    const isCustomFramework = fi.customFrameworkId !== null;
    const allReqDefs = await this.loadRequirementDefinitions(fi);
    const requirement = allReqDefs.find((r) => r.id === requirementKey);
    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const [relatedControls, frameworkTasks, notRelevantFormTypes] =
      await Promise.all([
        db.requirementMap.findMany({
          where: {
            frameworkInstanceId,
            archivedAt: null,
            ...(requirement.kind === 'custom'
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
                frameworkPolicyLinks: {
                  where: {
                    frameworkInstanceId,
                    policy: { archivedAt: null },
                  },
                  include: {
                    policy: {
                      select: { id: true, name: true, status: true },
                    },
                  },
                },
                frameworkDocumentLinks: {
                  where: { frameworkInstanceId },
                },
              },
            },
          },
        }),
        db.task.findMany({
          where: {
            organizationId,
            archivedAt: null,
            frameworkControlLinks: { some: { frameworkInstanceId } },
          },
          include: {
            frameworkControlLinks: {
              where: { frameworkInstanceId },
              include: { control: true },
            },
          },
        }),
        this.getNotRelevantFormTypes(organizationId),
      ]);

    const controlIds = relatedControls.map((rc) => rc.control.id);
    const directTasks =
      isCustomFramework && controlIds.length > 0
        ? await db.task.findMany({
            where: {
              organizationId,
              archivedAt: null,
              controls: { some: { id: { in: controlIds } } },
            },
            include: {
              controls: { where: { id: { in: controlIds } } },
            },
          })
        : [];

    const mergeOpts = { isCustomFramework, frameworkInstanceId, notRelevantFormTypes };
    const mappedRelatedControls = relatedControls.map((relatedControl) => ({
      ...relatedControl,
      control: mergeControlLinks(relatedControl.control, mergeOpts),
    }));

    const formTypes = new Set<EvidenceFormType>();
    for (const rc of mappedRelatedControls) {
      for (const dt of rc.control.controlDocumentTypes || []) {
        if (dt.isNotRelevant) continue;
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

    const mappedFrameworkTasks = frameworkTasks.map(
      ({ frameworkControlLinks, ...task }) => ({
        ...task,
        controls: frameworkControlLinks.map((link) => link.control),
      }),
    );
    const mappedDirectTasks = directTasks.map(({ controls, ...task }) => ({
      ...task,
      controls,
    }));

    return {
      requirement,
      relatedControls: mappedRelatedControls,
      tasks: deduplicateById([...mappedFrameworkTasks, ...mappedDirectTasks]),
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

  async getAllUpdateStatuses(organizationId: string) {
    const instances = await db.frameworkInstance.findMany({
      where: { organizationId, frameworkId: { not: null } },
      include: {
        currentVersion: { select: { id: true, version: true } },
        framework: { select: { id: true, name: true } },
      },
    });

    if (instances.length === 0) return [];

    const frameworkIds = [
      ...new Set(instances.map((i) => i.frameworkId).filter(Boolean)),
    ] as string[];

    const latestVersions = await Promise.all(
      frameworkIds.map((fid) =>
        db.frameworkVersion.findFirst({
          where: { frameworkId: fid },
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            version: true,
            publishedAt: true,
            releaseNotes: true,
            frameworkId: true,
          },
        }),
      ),
    );

    const latestByFramework = new Map(
      latestVersions
        .filter(Boolean)
        .map((v) => [v!.frameworkId, v!]),
    );

    return instances
      .map((instance) => {
        const latest = latestByFramework.get(instance.frameworkId!) ?? null;
        const updateAvailable =
          latest !== null && latest.id !== instance.currentVersion?.id;
        if (!updateAvailable) return null;

        return {
          frameworkInstanceId: instance.id,
          frameworkName: instance.framework?.name ?? null,
          currentVersion: instance.currentVersion,
          latestVersion: latest
            ? {
                id: latest.id,
                version: latest.version,
                publishedAt: latest.publishedAt,
                releaseNotes: latest.releaseNotes,
              }
            : null,
          updateAvailable,
        };
      })
      .filter(Boolean);
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
      return {
        currentVersion: null,
        latestVersion: null,
        updateAvailable: false,
      };
    }

    const latest = await db.frameworkVersion.findFirst({
      where: { frameworkId: instance.frameworkId },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        version: true,
        publishedAt: true,
        releaseNotes: true,
      },
    });

    return {
      currentVersion: instance.currentVersion,
      latestVersion: latest,
      updateAvailable:
        latest !== null && latest.id !== instance.currentVersion?.id,
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

    const fromManifest = instance.currentVersion
      .manifest as unknown as FrameworkManifest;
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

    const [instanceControls, instancePolicies, instanceTasks] =
      await Promise.all([
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
      fromVersionLabel: {
        id: instance.currentVersion.id,
        version: instance.currentVersion.version,
      },
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
        performedBy: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        rollbackExpiresAt: true,
        rolledBackByOperationId: true,
        fromVersion: { select: { id: true, version: true } },
        toVersion: { select: { id: true, version: true } },
        summary: true,
      },
    });
  }
}
