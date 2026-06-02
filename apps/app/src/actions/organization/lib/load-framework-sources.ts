import type {
  Prisma,
  EvidenceFormType,
  Frequency,
  Departments,
  TaskAutomationStatus,
} from '@db/server';

/**
 * Shape of FrameworkVersion.manifest. Kept in sync with the authoritative
 * type at apps/api/src/frameworks/framework-versioning/manifest.types.ts.
 * The Next.js app can't cross-import from apps/api, so the type lives here
 * as well.
 */
interface ManifestFramework {
  id: string;
  name: string;
  catalogVersion: string;
  description: string | null;
}
interface ManifestRequirement {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
}
interface ManifestControl {
  id: string;
  name: string;
  description: string;
  requirementIds: string[];
  policyIds: string[];
  taskIds: string[];
  documentTypes: string[];
}
interface ManifestPolicy {
  id: string;
  name: string;
  description: string | null;
  content: unknown;
  frequency: string | null;
  department: string | null;
}
interface ManifestTask {
  id: string;
  name: string;
  description: string;
  frequency: string | null;
  department: string | null;
}
interface FrameworkManifest {
  framework: ManifestFramework;
  requirements: ManifestRequirement[];
  controls: ManifestControl[];
  policies: ManifestPolicy[];
  tasks: ManifestTask[];
}

export interface LoadedFrameworkSources {
  controlTemplates: Array<{
    id: string;
    name: string;
    description: string;
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
  requirementToFrameworkId: Map<string, string>;
}

export interface LoadSourcesInput {
  frameworkEditorIds: string[];
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
  const controlsMap = new Map<string, LoadedFrameworkSources['controlTemplates'][number]>();
  const policiesMap = new Map<string, LoadedFrameworkSources['policyTemplates'][number]>();
  const tasksMap = new Map<string, LoadedFrameworkSources['taskTemplates'][number]>();
  // Requirement ids referenced by manifest controls, validated against live
  // FrameworkEditorRequirement rows below. Dead ones are pruned from relations
  // so RequirementMap inserts never reference a deleted requirement.
  const manifestRequirementIds = new Set<string>();
  const deadRequirementIds = new Set<string>();

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

  for (const [frameworkId, manifest] of manifestByFrameworkId) {
    for (const r of manifest.requirements) {
      requirementToFrameworkId.set(r.id, frameworkId);
    }
    for (const c of manifest.controls) {
      if (!controlsMap.has(c.id)) {
        controlsMap.set(c.id, {
          id: c.id,
          name: c.name,
          description: c.description,
          documentTypes: (c.documentTypes ?? []) as EvidenceFormType[],
        });
      }
      const rel = getOrCreateRelation(frameworkId, c.id);
      for (const rid of c.requirementIds) {
        rel.requirementTemplateIds.add(rid);
        manifestRequirementIds.add(rid);
      }
      for (const pid of c.policyIds) rel.policyTemplateIds.add(pid);
      for (const tid of c.taskIds) rel.taskTemplateIds.add(tid);
      for (const dt of c.documentTypes ?? []) rel.documentTypes.add(dt as EvidenceFormType);
    }
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
          automationStatus: 'AUTOMATED' as TaskAutomationStatus,
        });
      }
    }
  }

  // Manifests are frozen snapshots: a control/policy/task/requirement they
  // reference may have been hard-deleted from the live framework-editor tables
  // since the version was published. Org rows FK to those live tables
  // (Control.controlTemplateId, Policy.policyTemplateId, Task.taskTemplateId,
  // RequirementMap.requirementId), so creating one that points at a deleted
  // template raises a P2003 FK violation and aborts onboarding. Reconcile
  // against the live tables: resolve task automationStatus (only carried live)
  // and drop any manifest reference whose live row is gone. Fallback-path ids
  // are read straight from live tables below, so they are never pruned here.
  if (manifestByFrameworkId.size > 0) {
    const manifestControlIds = Array.from(controlsMap.keys());
    const manifestPolicyIds = Array.from(policiesMap.keys());
    const manifestTaskIds = Array.from(tasksMap.keys());
    const manifestReqIds = Array.from(manifestRequirementIds);

    const [liveControls, livePolicies, liveTasks, liveRequirements] = await Promise.all([
      tx.frameworkEditorControlTemplate.findMany({
        where: { id: { in: manifestControlIds } },
        select: { id: true },
      }),
      tx.frameworkEditorPolicyTemplate.findMany({
        where: { id: { in: manifestPolicyIds } },
        select: { id: true },
      }),
      tx.frameworkEditorTaskTemplate.findMany({
        where: { id: { in: manifestTaskIds } },
        select: { id: true, automationStatus: true },
      }),
      tx.frameworkEditorRequirement.findMany({
        where: { id: { in: manifestReqIds } },
        select: { id: true },
      }),
    ]);

    // automationStatus isn't carried in the manifest — copy it from the live row.
    for (const lt of liveTasks) {
      const existing = tasksMap.get(lt.id);
      if (existing) existing.automationStatus = lt.automationStatus;
    }

    const liveControlIds = new Set(liveControls.map((c) => c.id));
    const livePolicyIds = new Set(livePolicies.map((p) => p.id));
    const liveTaskIds = new Set(liveTasks.map((t) => t.id));
    const liveRequirementIds = new Set(liveRequirements.map((r) => r.id));

    const droppedControls = manifestControlIds.filter((id) => !liveControlIds.has(id));
    const droppedPolicies = manifestPolicyIds.filter((id) => !livePolicyIds.has(id));
    const droppedTasks = manifestTaskIds.filter((id) => !liveTaskIds.has(id));
    const droppedRequirements = manifestReqIds.filter((id) => !liveRequirementIds.has(id));

    for (const id of droppedControls) controlsMap.delete(id);
    for (const id of droppedPolicies) policiesMap.delete(id);
    for (const id of droppedTasks) tasksMap.delete(id);
    for (const id of droppedRequirements) deadRequirementIds.add(id);

    if (
      droppedControls.length ||
      droppedPolicies.length ||
      droppedTasks.length ||
      droppedRequirements.length
    ) {
      console.warn(
        `loadFrameworkSources: pruned manifest references with no live framework-editor template ` +
          `(stale manifest — republish the affected framework version). ` +
          `controls=[${droppedControls.join(', ')}] policies=[${droppedPolicies.join(', ')}] ` +
          `tasks=[${droppedTasks.join(', ')}] requirements=[${droppedRequirements.join(', ')}]`,
      );
    }
  }

  // Fallback for frameworks without a published version: live-template reads.
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
      select: { id: true, name: true, description: true, documentTypes: true },
    });
    for (const lc of liveControls) {
      if (!controlsMap.has(lc.id)) {
        controlsMap.set(lc.id, {
          id: lc.id,
          name: lc.name,
          description: lc.description,
          documentTypes: lc.documentTypes,
        });
      }
    }

    const fallbackControlIds = liveControls.map((c) => c.id);
    const controlRelationsLive = await tx.frameworkEditorControlTemplate.findMany({
      where: { id: { in: fallbackControlIds } },
      select: {
        id: true,
        requirements: { where: { id: { in: fallbackRequirementIds } }, select: { id: true } },
        policyTemplates: { select: { id: true } },
        taskTemplates: { select: { id: true } },
      },
    });
    for (const cr of controlRelationsLive) {
      const frameworkIds = new Set(
        cr.requirements
          .map((r) => requirementToFrameworkId.get(r.id))
          .filter((id): id is string => Boolean(id)),
      );
      for (const fwId of frameworkIds) {
        const rel = getOrCreateRelation(fwId, cr.id);
        for (const r of cr.requirements) {
          if (requirementToFrameworkId.get(r.id) === fwId) {
            rel.requirementTemplateIds.add(r.id);
          }
        }
        for (const p of cr.policyTemplates) rel.policyTemplateIds.add(p.id);
        for (const t of cr.taskTemplates) rel.taskTemplateIds.add(t.id);
        const controlEntry = controlsMap.get(cr.id);
        for (const dt of controlEntry?.documentTypes ?? []) rel.documentTypes.add(dt);
      }
    }

    const fallbackPolicyIds = controlRelationsLive.flatMap((cr) =>
      cr.policyTemplates.map((p) => p.id),
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
      cr.taskTemplates.map((t) => t.id),
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
    // Dead manifest requirements are pruned here: RequirementMap.requirementId
    // has no downstream instance-map guard (unlike policy/task ids), so a stale
    // id would otherwise FK-fail on RequirementMap_requirementId_fkey.
    requirementTemplateIds: Array.from(rel.requirementTemplateIds).filter(
      (id) => !deadRequirementIds.has(id),
    ),
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
