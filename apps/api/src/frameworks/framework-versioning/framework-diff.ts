import { normalizeFormType } from './form-type-normalize';
import type {
  FrameworkManifest,
  ManifestControl,
  ManifestPolicy,
  ManifestRequirement,
  ManifestTask,
} from './manifest.types';

export interface EntityDiff<T> {
  added: T[];
  removed: T[];
  updated: Array<{ id: string; from: T; to: T }>;
}

export interface EdgeDiff<E> {
  added: E[];
  removed: E[];
}

export interface ControlRequirementEdge {
  controlTemplateId: string;
  requirementTemplateId: string;
}

export interface ControlPolicyEdge {
  controlTemplateId: string;
  policyTemplateId: string;
}

export interface ControlTaskEdge {
  controlTemplateId: string;
  taskTemplateId: string;
}

export interface ControlDocumentTypeEdge {
  controlTemplateId: string;
  formType: string;
}

/**
 * Changes to the framework's own metadata (name / description). These don't
 * live in any entity list, so without this the diff treats a name- or
 * description-only edit as "no changes" and the Publish button stays disabled.
 */
export interface FrameworkMetaDiff {
  changed: boolean;
  name?: { from: string; to: string };
  description?: { from: string | null; to: string | null };
}

export interface ManifestDiff {
  framework: FrameworkMetaDiff;
  controls: EntityDiff<ManifestControl>;
  requirements: EntityDiff<ManifestRequirement>;
  policies: EntityDiff<ManifestPolicy>;
  tasks: EntityDiff<ManifestTask>;
  requirementMapEdges: EdgeDiff<ControlRequirementEdge>;
  controlPolicyEdges: EdgeDiff<ControlPolicyEdge>;
  controlTaskEdges: EdgeDiff<ControlTaskEdge>;
  controlDocumentTypeEdges: EdgeDiff<ControlDocumentTypeEdge>;
}

/**
 * Drop dangling references in each control's requirement/policy/task link
 * arrays — IDs that don't correspond to an entity in the manifest's top-level
 * list. Older snapshots (pre-filter) stored cross-framework IDs there, which
 * would otherwise appear in the diff as phantom add/remove edges pointing at
 * 'Unknown' entities. This normalization is local to the diff and does not
 * mutate the input manifests.
 */
function sanitizeManifestEdges(m: FrameworkManifest): FrameworkManifest {
  const reqIds = new Set(m.requirements.map((r) => r.id));
  const policyIds = new Set(m.policies.map((p) => p.id));
  const taskIds = new Set(m.tasks.map((t) => t.id));
  return {
    ...m,
    controls: m.controls.map((c) => ({
      ...c,
      requirementIds: c.requirementIds.filter((id) => reqIds.has(id)),
      policyIds: c.policyIds.filter((id) => policyIds.has(id)),
      taskIds: c.taskIds.filter((id) => taskIds.has(id)),
      // Normalize formTypes to the Prisma-client form (underscored). Backfilled
      // v1.0.0 manifests stored DB-mapped hyphen forms; collapsing both forms
      // to the canonical name here means the diff doesn't spuriously report
      // an add+remove for identical types, and downstream callers never see
      // the hyphenated shape. Preserve undefined-ness when the input didn't
      // carry documentTypes at all (older manifest shape).
      ...(c.documentTypes === undefined
        ? {}
        : { documentTypes: c.documentTypes.map(normalizeFormType) }),
    })),
  };
}

export function diffManifests(fromRaw: FrameworkManifest, toRaw: FrameworkManifest): ManifestDiff {
  const from = sanitizeManifestEdges(fromRaw);
  const to = sanitizeManifestEdges(toRaw);
  return {
    framework: diffFrameworkMeta(from.framework, to.framework),
    controls: diffEntities(from.controls, to.controls, controlEqual),
    requirements: diffEntities(from.requirements, to.requirements, requirementEqual),
    policies: diffEntities(from.policies, to.policies, policyEqual),
    tasks: diffEntities(from.tasks, to.tasks, taskEqual),
    requirementMapEdges: diffEdges(
      edgesFromControls(from.controls, (c) =>
        c.requirementIds.map((id) => ({ controlTemplateId: c.id, requirementTemplateId: id })),
      ),
      edgesFromControls(to.controls, (c) =>
        c.requirementIds.map((id) => ({ controlTemplateId: c.id, requirementTemplateId: id })),
      ),
      (a, b) =>
        a.controlTemplateId === b.controlTemplateId &&
        a.requirementTemplateId === b.requirementTemplateId,
    ),
    controlPolicyEdges: diffEdges(
      edgesFromControls(from.controls, (c) =>
        c.policyIds.map((id) => ({ controlTemplateId: c.id, policyTemplateId: id })),
      ),
      edgesFromControls(to.controls, (c) =>
        c.policyIds.map((id) => ({ controlTemplateId: c.id, policyTemplateId: id })),
      ),
      (a, b) =>
        a.controlTemplateId === b.controlTemplateId && a.policyTemplateId === b.policyTemplateId,
    ),
    controlTaskEdges: diffEdges(
      edgesFromControls(from.controls, (c) =>
        c.taskIds.map((id) => ({ controlTemplateId: c.id, taskTemplateId: id })),
      ),
      edgesFromControls(to.controls, (c) =>
        c.taskIds.map((id) => ({ controlTemplateId: c.id, taskTemplateId: id })),
      ),
      (a, b) =>
        a.controlTemplateId === b.controlTemplateId && a.taskTemplateId === b.taskTemplateId,
    ),
    controlDocumentTypeEdges: diffEdges(
      edgesFromControls(from.controls, (c) =>
        (c.documentTypes ?? []).map((formType) => ({ controlTemplateId: c.id, formType })),
      ),
      edgesFromControls(to.controls, (c) =>
        (c.documentTypes ?? []).map((formType) => ({ controlTemplateId: c.id, formType })),
      ),
      (a, b) => a.controlTemplateId === b.controlTemplateId && a.formType === b.formType,
    ),
  };
}

function diffEntities<T extends { id: string }>(
  from: T[],
  to: T[],
  equal: (a: T, b: T) => boolean,
): EntityDiff<T> {
  const fromMap = new Map(from.map((x) => [x.id, x]));
  const toMap = new Map(to.map((x) => [x.id, x]));
  const added: T[] = [];
  const removed: T[] = [];
  const updated: EntityDiff<T>['updated'] = [];

  for (const [id, item] of toMap) {
    const prev = fromMap.get(id);
    if (!prev) added.push(item);
    else if (!equal(prev, item)) updated.push({ id, from: prev, to: item });
  }
  for (const [id, item] of fromMap) {
    if (!toMap.has(id)) removed.push(item);
  }

  return { added, removed, updated };
}

function diffEdges<E>(from: E[], to: E[], equal: (a: E, b: E) => boolean): EdgeDiff<E> {
  const added = to.filter((x) => !from.some((y) => equal(x, y)));
  const removed = from.filter((x) => !to.some((y) => equal(x, y)));
  return { added, removed };
}

function edgesFromControls<E>(
  controls: ManifestControl[],
  extract: (c: ManifestControl) => E[],
): E[] {
  return controls.flatMap(extract);
}

function diffFrameworkMeta(
  from: FrameworkManifest['framework'],
  to: FrameworkManifest['framework'],
): FrameworkMetaDiff {
  const nameChanged = from.name !== to.name;
  const fromDescription = from.description ?? null;
  const toDescription = to.description ?? null;
  const descriptionChanged = fromDescription !== toDescription;
  return {
    changed: nameChanged || descriptionChanged,
    ...(nameChanged ? { name: { from: from.name, to: to.name } } : {}),
    ...(descriptionChanged
      ? { description: { from: fromDescription, to: toDescription } }
      : {}),
  };
}

function controlEqual(a: ManifestControl, b: ManifestControl): boolean {
  return a.name === b.name && a.description === b.description && (a.controlFamily ?? null) === (b.controlFamily ?? null);
}

function requirementEqual(a: ManifestRequirement, b: ManifestRequirement): boolean {
  return (
    a.identifier === b.identifier &&
    a.name === b.name &&
    a.description === b.description &&
    (a.requirementFamily ?? null) === (b.requirementFamily ?? null)
  );
}

function policyEqual(a: ManifestPolicy, b: ManifestPolicy): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.frequency === b.frequency &&
    a.department === b.department &&
    jsonEqual(a.content, b.content)
  );
}

function taskEqual(a: ManifestTask, b: ManifestTask): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.frequency === b.frequency &&
    a.department === b.department
  );
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
