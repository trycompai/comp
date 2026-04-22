import { Prisma } from '@prisma/client';
import { db } from '../client';

export interface BackfillResult {
  versionsCreated: number;
  instancesBackfilled: number;
}

type FrameworkWithTemplates = Prisma.FrameworkEditorFrameworkGetPayload<{
  include: {
    requirements: {
      include: {
        controlTemplates: {
          include: {
            requirements: true;
            policyTemplates: true;
            taskTemplates: true;
          };
        };
      };
    };
  };
}>;

export async function backfillFrameworkVersions(): Promise<BackfillResult> {
  const frameworks = await db.frameworkEditorFramework.findMany({
    include: {
      requirements: {
        include: {
          controlTemplates: {
            include: {
              requirements: true,
              policyTemplates: true,
              taskTemplates: true,
            },
          },
        },
      },
    },
  });

  let versionsCreated = 0;

  for (const framework of frameworks) {
    const existing = await db.frameworkVersion.findUnique({
      where: { frameworkId_version: { frameworkId: framework.id, version: '1.0.0' } },
    });
    if (existing) continue;

    const manifest = buildManifestFromFramework(framework);

    await db.frameworkVersion.create({
      data: {
        frameworkId: framework.id,
        version: '1.0.0',
        manifest: manifest as object,
        releaseNotes: 'Initial version (backfilled).',
      },
    });
    versionsCreated += 1;
  }

  // Backfill instances
  const versions = await db.frameworkVersion.findMany({
    where: { version: '1.0.0' },
    select: { id: true, frameworkId: true },
  });
  const byFrameworkId = new Map(versions.map((v) => [v.frameworkId, v.id]));

  const toBackfill = await db.frameworkInstance.findMany({
    where: { currentVersionId: null, frameworkId: { not: null } },
    select: { id: true, frameworkId: true },
  });

  let instancesBackfilled = 0;
  for (const inst of toBackfill) {
    const versionId = byFrameworkId.get(inst.frameworkId!);
    if (!versionId) continue;
    await db.frameworkInstance.update({
      where: { id: inst.id },
      data: { currentVersionId: versionId },
    });
    instancesBackfilled += 1;
  }

  return { versionsCreated, instancesBackfilled };
}

function buildManifestFromFramework(framework: FrameworkWithTemplates) {
  // Collect all unique control templates across all requirements
  const controlTemplateMap = new Map<
    string,
    FrameworkWithTemplates['requirements'][number]['controlTemplates'][number]
  >();
  for (const req of framework.requirements) {
    for (const ct of req.controlTemplates) {
      if (!controlTemplateMap.has(ct.id)) {
        controlTemplateMap.set(ct.id, ct);
      }
    }
  }
  const controlTemplates = [...controlTemplateMap.values()];

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
    controls: controlTemplates.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      requirementIds: c.requirements.map((r) => r.id),
      policyIds: c.policyTemplates.map((p) => p.id),
      taskIds: c.taskTemplates.map((t) => t.id),
    })),
    policies: dedupeById(
      controlTemplates.flatMap((c) =>
        c.policyTemplates.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          content: p.content,
          frequency: p.frequency as string,
          department: p.department as string,
        })),
      ),
    ),
    tasks: dedupeById(
      controlTemplates.flatMap((c) =>
        c.taskTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          frequency: t.frequency as string,
          department: t.department as string,
        })),
      ),
    ),
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}

if (require.main === module) {
  backfillFrameworkVersions()
    .then((result) => {
      console.log('Backfill complete:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}
