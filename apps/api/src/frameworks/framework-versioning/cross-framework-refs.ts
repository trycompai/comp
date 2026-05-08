import type { FrameworkManifest } from './manifest.types';

export interface CrossFrameworkRefs {
  controlTemplateIds: Set<string>;
  policyTemplateIds: Set<string>;
  taskTemplateIds: Set<string>;
}

export interface BuildRefsInput {
  otherInstances: Array<{ frameworkInstanceId: string; manifest: FrameworkManifest }>;
}

export function buildCrossFrameworkRefs({ otherInstances }: BuildRefsInput): CrossFrameworkRefs {
  const controlTemplateIds = new Set<string>();
  const policyTemplateIds = new Set<string>();
  const taskTemplateIds = new Set<string>();

  for (const { manifest } of otherInstances) {
    for (const c of manifest.controls) controlTemplateIds.add(c.id);
    for (const p of manifest.policies) policyTemplateIds.add(p.id);
    for (const t of manifest.tasks) taskTemplateIds.add(t.id);
  }

  return { controlTemplateIds, policyTemplateIds, taskTemplateIds };
}
