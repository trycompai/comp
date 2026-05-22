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
  controlFamily?: string | null;
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
  fromVersion: { id: string; version: string };
  toVersion: { id: string; version: string };
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
    controlPolicy: EdgePreviewBuckets<ControlPolicyLink>;
    controlTask: EdgePreviewBuckets<ControlTaskLink>;
    controlRequirement: EdgePreviewBuckets<ControlRequirementLink>;
    controlDocumentType: EdgePreviewBuckets<ControlDocumentTypeLink>;
  };
}

export interface EdgePreviewBuckets<T> {
  added: T[];
  removed: T[];
}

export interface ControlPolicyLink {
  controlName: string;
  policyName: string;
}

export interface ControlTaskLink {
  controlName: string;
  taskName: string;
}

export interface ControlRequirementLink {
  controlName: string;
  requirementIdentifier: string;
  requirementName: string;
}

export interface ControlDocumentTypeLink {
  controlName: string;
  formType: string;
}

export interface BuildUpdatePreviewInput {
  fromManifest: FrameworkManifest;
  toManifest: FrameworkManifest;
  instanceControls: InstanceControl[];
  instanceTasks: InstanceTask[];
  instancePolicies: InstancePolicy[];
  // Required: every real caller pairs a preview with concrete version ids so
  // the sync engine can operate on known snapshots. Making this optional let
  // preview payloads ship without version identity.
  fromVersionLabel: { id: string; version: string };
  toVersionLabel: { id: string; version: string };
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
    fromVersion: input.fromVersionLabel,
    toVersion: input.toVersionLabel,
    releaseNotes: input.releaseNotes ?? null,
    controls,
    tasks,
    policies,
    requirements: {
      added: d.requirements.added,
      removed: d.requirements.removed,
      updated: d.requirements.updated.map((u) => ({ from: u.from, to: u.to })),
    },
    edges: buildEdgeLinks(input.fromManifest, input.toManifest, d),
  };
}

function buildEdgeLinks(
  fromManifest: FrameworkManifest,
  toManifest: FrameworkManifest,
  d: ReturnType<typeof diffManifests>,
): UpdatePreview['edges'] {
  // Resolve template IDs to display names using both manifests (an edge's
  // referent may have been removed or added within the same diff).
  const nameForControl = (id: string) =>
    toManifest.controls.find((c) => c.id === id)?.name ??
    fromManifest.controls.find((c) => c.id === id)?.name ??
    'Unknown control';
  const nameForPolicy = (id: string) =>
    toManifest.policies.find((p) => p.id === id)?.name ??
    fromManifest.policies.find((p) => p.id === id)?.name ??
    'Unknown policy';
  const nameForTask = (id: string) =>
    toManifest.tasks.find((t) => t.id === id)?.name ??
    fromManifest.tasks.find((t) => t.id === id)?.name ??
    'Unknown task';
  const requirementInfo = (id: string) => {
    const r =
      toManifest.requirements.find((x) => x.id === id) ??
      fromManifest.requirements.find((x) => x.id === id);
    return {
      requirementIdentifier: r?.identifier ?? '',
      requirementName: r?.name ?? 'Unknown requirement',
    };
  };

  return {
    controlPolicy: {
      added: d.controlPolicyEdges.added.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        policyName: nameForPolicy(e.policyTemplateId),
      })),
      removed: d.controlPolicyEdges.removed.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        policyName: nameForPolicy(e.policyTemplateId),
      })),
    },
    controlTask: {
      added: d.controlTaskEdges.added.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        taskName: nameForTask(e.taskTemplateId),
      })),
      removed: d.controlTaskEdges.removed.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        taskName: nameForTask(e.taskTemplateId),
      })),
    },
    controlRequirement: {
      added: d.requirementMapEdges.added.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        ...requirementInfo(e.requirementTemplateId),
      })),
      removed: d.requirementMapEdges.removed.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        ...requirementInfo(e.requirementTemplateId),
      })),
    },
    controlDocumentType: {
      added: d.controlDocumentTypeEdges.added.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        formType: e.formType,
      })),
      removed: d.controlDocumentTypeEdges.removed.map((e) => ({
        controlName: nameForControl(e.controlTemplateId),
        formType: e.formType,
      })),
    },
  };
}
