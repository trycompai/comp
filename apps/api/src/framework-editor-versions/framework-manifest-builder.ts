import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type {
  FrameworkManifest,
  ManifestControl,
  ManifestPolicy,
  ManifestTask,
} from '../frameworks/framework-versioning/manifest.types';

export async function buildManifestForFramework(frameworkId: string): Promise<FrameworkManifest> {
  const framework = await db.frameworkEditorFramework.findUnique({
    where: { id: frameworkId },
    include: {
      requirements: {
        include: {
          controlTemplates: {
            include: {
              requirements: { select: { id: true } },
              policyTemplates: true,
              taskTemplates: true,
            },
          },
        },
      },
    },
  });

  if (!framework) throw new NotFoundException('Framework not found');

  // Collect all unique control templates across all requirements, deduped by id.
  const controlsMap = new Map<string, ManifestControl>();
  const policiesMap = new Map<string, ManifestPolicy>();
  const tasksMap = new Map<string, ManifestTask>();

  // A control template's `requirements` relation spans every framework that
  // has mapped it — filter down to requirements belonging to THIS framework
  // so the manifest doesn't reference IDs that aren't in its own `requirements`.
  const ownRequirementIds = new Set(framework.requirements.map((r) => r.id));

  for (const req of framework.requirements) {
    for (const ct of req.controlTemplates) {
      if (!controlsMap.has(ct.id)) {
        controlsMap.set(ct.id, {
          id: ct.id,
          name: ct.name,
          description: ct.description,
          requirementIds: ct.requirements
            .map((r) => r.id)
            .filter((id) => ownRequirementIds.has(id)),
          policyIds: ct.policyTemplates.map((p) => p.id),
          taskIds: ct.taskTemplates.map((t) => t.id),
          documentTypes: [...ct.documentTypes],
        });
      }
      for (const pt of ct.policyTemplates) {
        if (!policiesMap.has(pt.id)) {
          policiesMap.set(pt.id, {
            id: pt.id,
            name: pt.name,
            description: pt.description,
            content: pt.content,
            frequency: pt.frequency,
            department: pt.department,
          });
        }
      }
      for (const tt of ct.taskTemplates) {
        if (!tasksMap.has(tt.id)) {
          tasksMap.set(tt.id, {
            id: tt.id,
            name: tt.name,
            description: tt.description,
            frequency: tt.frequency,
            department: tt.department,
          });
        }
      }
    }
  }

  return {
    framework: {
      id: framework.id,
      name: framework.name,
      catalogVersion: framework.version,
      description: framework.description,
    },
    requirements: framework.requirements.map((r) => ({
      id: r.id,
      identifier: r.identifier,
      name: r.name,
      description: r.description,
    })),
    controls: [...controlsMap.values()],
    policies: [...policiesMap.values()],
    tasks: [...tasksMap.values()],
  };
}
