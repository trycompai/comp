import { diffManifests } from './framework-diff';
import { isControlEdited, isPolicyEdited, isTaskEdited } from './framework-drift';
import type {
  FrameworkManifest,
  ManifestControl,
  ManifestPolicy,
  ManifestRequirement,
  ManifestTask,
} from './manifest.types';

export interface InstanceControl {
  id: string;
  controlTemplateId: string | null;
  name: string;
  description: string;
}

export interface InstanceTask {
  id: string;
  taskTemplateId: string | null;
  title: string;
  description: string;
  frequency: string | null;
  department: string | null;
}

export interface InstancePolicy {
  id: string;
  policyTemplateId: string | null;
  name: string;
  description: string | null;
  content: unknown;
  frequency: string | null;
  department: string | null;
  status: 'draft' | 'published' | string;
}

export interface PolicyUpdatePreviewBuckets {
  added: ManifestPolicy[];
  archived: Array<{ instanceId: string; manifest: ManifestPolicy }>;
  updatedApplied: Array<{ instance: InstancePolicy; manifestFrom: ManifestPolicy; manifestTo: ManifestPolicy }>;
  updatedPreserved: Array<{ instance: InstancePolicy; manifestFrom: ManifestPolicy; manifestTo: ManifestPolicy }>;
  draftAddedForPublished: Array<{ instance: InstancePolicy; manifestTo: ManifestPolicy }>;
}

export interface UpdatePreview {
  fromVersion: { id?: string; version: string };
  toVersion: { id?: string; version: string };
  releaseNotes: string | null;
  controls: {
    added: ManifestControl[];
    archived: Array<{ instanceId: string; manifest: ManifestControl }>;
    updatedApplied: Array<{ instance: InstanceControl; manifestFrom: ManifestControl; manifestTo: ManifestControl }>;
    updatedPreserved: Array<{ instance: InstanceControl; manifestFrom: ManifestControl; manifestTo: ManifestControl }>;
  };
  tasks: {
    added: ManifestTask[];
    archived: Array<{ instanceId: string; manifest: ManifestTask }>;
    updatedApplied: Array<{ instance: InstanceTask; manifestFrom: ManifestTask; manifestTo: ManifestTask }>;
    updatedPreserved: Array<{ instance: InstanceTask; manifestFrom: ManifestTask; manifestTo: ManifestTask }>;
  };
  policies: PolicyUpdatePreviewBuckets;
  requirements: {
    added: ManifestRequirement[];
    removed: ManifestRequirement[];
    updated: Array<{ from: ManifestRequirement; to: ManifestRequirement }>;
  };
  edges: {
    controlPolicy: { added: number; removed: number };
    controlTask: { added: number; removed: number };
    controlRequirement: { added: number; removed: number };
  };
}

export interface BuildUpdatePreviewInput {
  fromManifest: FrameworkManifest;
  toManifest: FrameworkManifest;
  instanceControls: InstanceControl[];
  instanceTasks: InstanceTask[];
  instancePolicies: InstancePolicy[];
  fromVersionLabel?: { id: string; version: string };
  toVersionLabel?: { id: string; version: string };
  releaseNotes?: string | null;
}

export function buildUpdatePreview(input: BuildUpdatePreviewInput): UpdatePreview {
  const d = diffManifests(input.fromManifest, input.toManifest);

  const ctlByTemplate = new Map(
    input.instanceControls
      .filter((c) => c.controlTemplateId)
      .map((c) => [c.controlTemplateId!, c]),
  );
  const taskByTemplate = new Map(
    input.instanceTasks
      .filter((t) => t.taskTemplateId)
      .map((t) => [t.taskTemplateId!, t]),
  );
  const polByTemplate = new Map(
    input.instancePolicies
      .filter((p) => p.policyTemplateId)
      .map((p) => [p.policyTemplateId!, p]),
  );

  const controls: UpdatePreview['controls'] = {
    added: d.controls.added,
    archived: [],
    updatedApplied: [],
    updatedPreserved: [],
  };
  for (const r of d.controls.removed) {
    const inst = ctlByTemplate.get(r.id);
    if (inst) controls.archived.push({ instanceId: inst.id, manifest: r });
  }
  for (const u of d.controls.updated) {
    const inst = ctlByTemplate.get(u.id);
    if (!inst) continue;
    const bucket = isControlEdited(inst, u.from) ? controls.updatedPreserved : controls.updatedApplied;
    bucket.push({ instance: inst, manifestFrom: u.from, manifestTo: u.to });
  }

  const tasks: UpdatePreview['tasks'] = {
    added: d.tasks.added,
    archived: [],
    updatedApplied: [],
    updatedPreserved: [],
  };
  for (const r of d.tasks.removed) {
    const inst = taskByTemplate.get(r.id);
    if (inst) tasks.archived.push({ instanceId: inst.id, manifest: r });
  }
  for (const u of d.tasks.updated) {
    const inst = taskByTemplate.get(u.id);
    if (!inst) continue;
    const bucket = isTaskEdited(inst, u.from) ? tasks.updatedPreserved : tasks.updatedApplied;
    bucket.push({ instance: inst, manifestFrom: u.from, manifestTo: u.to });
  }

  const policies: PolicyUpdatePreviewBuckets = {
    added: d.policies.added,
    archived: [],
    updatedApplied: [],
    updatedPreserved: [],
    draftAddedForPublished: [],
  };
  for (const r of d.policies.removed) {
    const inst = polByTemplate.get(r.id);
    if (inst) policies.archived.push({ instanceId: inst.id, manifest: r });
  }
  for (const u of d.policies.updated) {
    const inst = polByTemplate.get(u.id);
    if (!inst) continue;
    if (inst.status === 'published') {
      policies.draftAddedForPublished.push({ instance: inst, manifestTo: u.to });
      continue;
    }
    const bucket = isPolicyEdited(inst, u.from) ? policies.updatedPreserved : policies.updatedApplied;
    bucket.push({ instance: inst, manifestFrom: u.from, manifestTo: u.to });
  }

  return {
    fromVersion: input.fromVersionLabel ?? { version: input.fromManifest.framework.catalogVersion },
    toVersion: input.toVersionLabel ?? { version: input.toManifest.framework.catalogVersion },
    releaseNotes: input.releaseNotes ?? null,
    controls,
    tasks,
    policies,
    requirements: {
      added: d.requirements.added,
      removed: d.requirements.removed,
      updated: d.requirements.updated.map((u) => ({ from: u.from, to: u.to })),
    },
    edges: {
      controlPolicy: {
        added: d.controlPolicyEdges.added.length,
        removed: d.controlPolicyEdges.removed.length,
      },
      controlTask: {
        added: d.controlTaskEdges.added.length,
        removed: d.controlTaskEdges.removed.length,
      },
      controlRequirement: {
        added: d.requirementMapEdges.added.length,
        removed: d.requirementMapEdges.removed.length,
      },
    },
  };
}
