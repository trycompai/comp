import type {
  Prisma,
  EvidenceFormType,
  Frequency,
  Departments,
  TaskAutomationStatus,
} from '@db';
import type { FrameworkManifest } from './framework-versioning/manifest.types';

/**
 * Unified control/policy/task data and relations, sourced from either a
 * framework's pinned FrameworkVersion.manifest or (fallback) the live
 * framework-editor tables. Onboarding builds org-level Control/Policy/Task
 * rows from this shape, which means a new org is pinned to the same snapshot
 * its `currentVersionId` points at — not to whatever CX is editing live.
 */
export interface LoadedFrameworkSources {
  controlTemplates: Array<{
    id: string;
    name: string;
    description: string;
    controlFamily?: string;
    documentTypes: EvidenceFormType[];
  }>;
  policyTemplates: Array<{
    id: string;
    name: string;
    description: string;
    content: Prisma.JsonValue;
    frequency: Frequency;
    department: Departments;
  }>;
  taskTemplates: Array<{
    id: string;
    name: string;
    description: string;
    frequency: Frequency | null;
    department: Departments | null;
    automationStatus: TaskAutomationStatus;
  }>;
  groupedRelations: Array<{
    frameworkId: string;
    controlTemplateId: string;
    requirementTemplateIds: string[];
    policyTemplateIds: string[];
    taskTemplateIds: string[];
    documentTypes: EvidenceFormType[];
  }>;
  latestVersionByFrameworkId: Map<string, string>;
  frameworksWithoutVersion: string[];
  /** requirementTemplateId → its owning frameworkEditorId (for RequirementMap). */
  requirementToFrameworkId: Map<string, string>;
}

export interface LoadSourcesInput {
  frameworkEditorIds: string[];
  /** Passed through for the fallback path when a framework has no version. */
  frameworkEditorFrameworks: Prisma.FrameworkEditorFrameworkGetPayload<{
    include: { requirements: true };
  }>[];
  tx: Prisma.TransactionClient;
}

export async function loadFrameworkSources({
  frameworkEditorIds,
  frameworkEditorFrameworks,
  tx,
}: LoadSourcesInput): Promise<LoadedFrameworkSources> {
  const versions = await tx.frameworkVersion.findMany({
    where: { frameworkId: { in: frameworkEditorIds } },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, frameworkId: true, manifest: true },
  });
  const latestVersionByFrameworkId = new Map<string, string>();
  const manifestByFrameworkId = new Map<string, FrameworkManifest>();
  for (const v of versions) {
    if (!latestVersionByFrameworkId.has(v.frameworkId)) {
      latestVersionByFrameworkId.set(v.frameworkId, v.id);
      manifestByFrameworkId.set(v.frameworkId, v.manifest as unknown as FrameworkManifest);
    }
  }
  const frameworksWithoutVersion = frameworkEditorIds.filter(
    (fid) => !latestVersionByFrameworkId.has(fid),
  );

  const requirementToFrameworkId = new Map<string, string>();

  // Collect controls/policies/tasks across all frameworks, deduped by id.
  const controlsMap = new Map<string, LoadedFrameworkSources['controlTemplates'][number]>();
  const policiesMap = new Map<string, LoadedFrameworkSources['policyTemplates'][number]>();
  const tasksMap = new Map<string, LoadedFrameworkSources['taskTemplates'][number]>();

  // groupedRelations accumulates per-framework control edges. A reusable
  // control can carry different policy/task/document links in each framework.
  const relationsByControl = new Map<
    string,
    {
      frameworkId: string;
      controlTemplateId: string;
      requirementTemplateIds: Set<string>;
      policyTemplateIds: Set<string>;
      taskTemplateIds: Set<string>;
      documentTypes: Set<EvidenceFormType>;
    }
  >();

  const getOrCreateRelation = (frameworkId: string, controlTemplateId: string) => {
    const key = `${frameworkId}::${controlTemplateId}`;
    let rel = relationsByControl.get(key);
    if (!rel) {
      rel = {
        frameworkId,
        controlTemplateId,
        requirementTemplateIds: new Set(),
        policyTemplateIds: new Set(),
        taskTemplateIds: new Set(),
        documentTypes: new Set(),
      };
      relationsByControl.set(key, rel);
    }
    return rel;
  };

  // Manifest-backed frameworks
  const manifestFrameworkIds: string[] = [];
  for (const [frameworkId, manifest] of manifestByFrameworkId) {
    manifestFrameworkIds.push(frameworkId);
    for (const r of manifest.requirements) {
      requirementToFrameworkId.set(r.id, frameworkId);
    }
    for (const c of manifest.controls) {
      if (!controlsMap.has(c.id)) {
        controlsMap.set(c.id, {
          id: c.id,
          name: c.name,
          description: c.description,
          controlFamily: c.controlFamily,
          documentTypes: (c.documentTypes ?? []) as EvidenceFormType[],
        });
      }
      const rel = getOrCreateRelation(frameworkId, c.id);
      for (const rid of c.requirementIds) rel.requirementTemplateIds.add(rid);
      for (const pid of c.policyIds) rel.policyTemplateIds.add(pid);
      for (const tid of c.taskIds) rel.taskTemplateIds.add(tid);
      for (const formType of c.documentTypes ?? []) {
        rel.documentTypes.add(formType as EvidenceFormType);
      }
    }
  }

  // Policy/task non-versioned fields: manifest carries name/description/
  // frequency/department/content, but NOT automationStatus. Resolve that from
  // live template rows by id. (Manifest stores frequency/department as
  // strings — cast to the enum types at insert time.)
  for (const [frameworkId, manifest] of manifestByFrameworkId) {
    for (const p of manifest.policies) {
      if (!policiesMap.has(p.id)) {
        policiesMap.set(p.id, {
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          content: p.content as Prisma.JsonValue,
          frequency: p.frequency as unknown as Frequency,
          department: p.department as unknown as Departments,
        });
      }
    }
    for (const t of manifest.tasks) {
      if (!tasksMap.has(t.id)) {
        tasksMap.set(t.id, {
          id: t.id,
          name: t.name,
          description: t.description,
          frequency: (t.frequency as unknown as Frequency | null) ?? null,
          department: (t.department as unknown as Departments | null) ?? null,
          // Resolved from live template below; AUTOMATED is the schema default
          // and a safe fallback if the live template has been deleted.
          automationStatus: 'AUTOMATED' as TaskAutomationStatus,
        });
      }
    }
    void frameworkId; // keep loop structure tidy; id used above
  }

  // Resolve automationStatus from live task templates for any manifest tasks
  const manifestTaskIds = Array.from(tasksMap.keys());
  if (manifestTaskIds.length > 0) {
    const liveTasks = await tx.frameworkEditorTaskTemplate.findMany({
      where: { id: { in: manifestTaskIds } },
      select: { id: true, automationStatus: true },
    });
    for (const lt of liveTasks) {
      const existing = tasksMap.get(lt.id);
      if (existing) existing.automationStatus = lt.automationStatus;
    }
  }

  // Fallback: frameworks without a published version load from live tables.
  if (frameworksWithoutVersion.length > 0) {
    const fallbackFrameworks = frameworkEditorFrameworks.filter((f) =>
      frameworksWithoutVersion.includes(f.id),
    );
    const fallbackRequirementIds = fallbackFrameworks.flatMap((f) =>
      f.requirements.map((r) => r.id),
    );
    for (const f of fallbackFrameworks) {
      for (const r of f.requirements) {
        if (!requirementToFrameworkId.has(r.id)) {
          requirementToFrameworkId.set(r.id, f.id);
        }
      }
    }

    const liveControls = await tx.frameworkEditorControlTemplate.findMany({
      where: { requirements: { some: { id: { in: fallbackRequirementIds } } } },
      select: { id: true, name: true, description: true, controlFamily: true, documentTypes: true },
    });
    for (const lc of liveControls) {
      if (!controlsMap.has(lc.id)) {
        controlsMap.set(lc.id, {
          id: lc.id,
          name: lc.name,
          description: lc.description,
          controlFamily: lc.controlFamily ?? undefined,
          documentTypes: lc.documentTypes,
        });
      }
    }

    const fallbackControlIds = liveControls.map((c) => c.id);
    const controlRelationsLive = await tx.frameworkEditorControlTemplate.findMany({
      where: { id: { in: fallbackControlIds } },
      select: {
        id: true,
        requirements: {
          where: { id: { in: fallbackRequirementIds } },
          select: { id: true },
        },
        frameworkPolicyLinks: {
          where: { frameworkId: { in: frameworksWithoutVersion } },
          select: { frameworkId: true, policyTemplateId: true },
        },
        frameworkTaskLinks: {
          where: { frameworkId: { in: frameworksWithoutVersion } },
          select: { frameworkId: true, taskTemplateId: true },
        },
        frameworkDocumentLinks: {
          where: { frameworkId: { in: frameworksWithoutVersion } },
          select: { frameworkId: true, formType: true },
        },
      },
    });
    for (const cr of controlRelationsLive) {
      const frameworkIds = new Set(
        cr.requirements
          .map((r) => requirementToFrameworkId.get(r.id))
          .filter((id): id is string => Boolean(id)),
      );
      for (const frameworkId of frameworkIds) {
        const rel = getOrCreateRelation(frameworkId, cr.id);
        for (const r of cr.requirements) {
          if (requirementToFrameworkId.get(r.id) === frameworkId) {
            rel.requirementTemplateIds.add(r.id);
          }
        }
        for (const link of cr.frameworkPolicyLinks) {
          if (link.frameworkId === frameworkId) {
            rel.policyTemplateIds.add(link.policyTemplateId);
          }
        }
        for (const link of cr.frameworkTaskLinks) {
          if (link.frameworkId === frameworkId) {
            rel.taskTemplateIds.add(link.taskTemplateId);
          }
        }
        for (const link of cr.frameworkDocumentLinks) {
          if (link.frameworkId === frameworkId) {
            rel.documentTypes.add(link.formType);
          }
        }
      }
    }

    const fallbackPolicyIds = controlRelationsLive.flatMap((cr) =>
      cr.frameworkPolicyLinks.map((p) => p.policyTemplateId),
    );
    if (fallbackPolicyIds.length > 0) {
      const livePolicies = await tx.frameworkEditorPolicyTemplate.findMany({
        where: { id: { in: fallbackPolicyIds } },
      });
      for (const lp of livePolicies) {
        if (!policiesMap.has(lp.id)) {
          policiesMap.set(lp.id, {
            id: lp.id,
            name: lp.name,
            description: lp.description,
            content: lp.content,
            frequency: lp.frequency,
            department: lp.department,
          });
        }
      }
    }

    const fallbackTaskIds = controlRelationsLive.flatMap((cr) =>
      cr.frameworkTaskLinks.map((t) => t.taskTemplateId),
    );
    if (fallbackTaskIds.length > 0) {
      const liveTasks = await tx.frameworkEditorTaskTemplate.findMany({
        where: { id: { in: fallbackTaskIds } },
      });
      for (const lt of liveTasks) {
        if (!tasksMap.has(lt.id)) {
          tasksMap.set(lt.id, {
            id: lt.id,
            name: lt.name,
            description: lt.description,
            frequency: lt.frequency,
            department: lt.department,
            automationStatus: lt.automationStatus,
          });
        }
      }
    }
  }

  const groupedRelations = Array.from(relationsByControl.values()).map((rel) => ({
    frameworkId: rel.frameworkId,
    controlTemplateId: rel.controlTemplateId,
    requirementTemplateIds: Array.from(rel.requirementTemplateIds),
    policyTemplateIds: Array.from(rel.policyTemplateIds),
    taskTemplateIds: Array.from(rel.taskTemplateIds),
    documentTypes: Array.from(rel.documentTypes),
  }));

  return {
    controlTemplates: Array.from(controlsMap.values()),
    policyTemplates: Array.from(policiesMap.values()),
    taskTemplates: Array.from(tasksMap.values()),
    groupedRelations,
    latestVersionByFrameworkId,
    frameworksWithoutVersion,
    requirementToFrameworkId,
  };
}
