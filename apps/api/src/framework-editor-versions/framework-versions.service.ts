import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { buildManifestForFramework } from './framework-manifest-builder';
import { diffManifests } from '../frameworks/framework-versioning/framework-diff';
import type { FrameworkManifest } from '../frameworks/framework-versioning/manifest.types';

const SEMVER = /^\d+\.\d+\.\d+$/;

export interface PublishParams {
  frameworkId: string;
  version: string;
  releaseNotes?: string;
  publishedById: string;
}

@Injectable()
export class FrameworkVersionsService {
  async publish({ frameworkId, version, releaseNotes, publishedById }: PublishParams) {
    if (!SEMVER.test(version)) {
      throw new BadRequestException('version must be MAJOR.MINOR.PATCH');
    }

    const framework = await db.frameworkEditorFramework.findUnique({ where: { id: frameworkId } });
    if (!framework) throw new NotFoundException('Framework not found');

    const existing = await db.frameworkVersion.findUnique({
      where: { frameworkId_version: { frameworkId, version } },
    });
    if (existing) throw new ConflictException(`Version ${version} already published`);

    const manifest = await buildManifestForFramework(frameworkId);

    return db.frameworkVersion.create({
      data: {
        frameworkId,
        version,
        releaseNotes: releaseNotes ?? null,
        manifest: manifest as unknown as object,
        publishedById,
      },
    });
  }

  async list(frameworkId: string) {
    return db.frameworkVersion.findMany({
      where: { frameworkId },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        version: true,
        publishedAt: true,
        publishedById: true,
        publishedBy: { select: { id: true, name: true, email: true } },
        releaseNotes: true,
      },
    });
  }

  async get(frameworkId: string, versionId: string) {
    const v = await db.frameworkVersion.findUnique({ where: { id: versionId } });
    if (!v || v.frameworkId !== frameworkId) throw new NotFoundException('Version not found');
    return v;
  }

  async getDraftDiff(frameworkId: string) {
    const latest = await db.frameworkVersion.findFirst({
      where: { frameworkId },
      orderBy: { publishedAt: 'desc' },
    });
    if (!latest) {
      throw new NotFoundException('No published version yet — publish v1.0.0 first');
    }
    const fromManifest = latest.manifest as unknown as FrameworkManifest;
    const toManifest = await buildManifestForFramework(frameworkId);
    const diff = diffManifests(fromManifest, toManifest);

    return {
      latestVersion: { id: latest.id, version: latest.version },
      diff,
      linkChanges: resolveLinkChanges(diff, fromManifest, toManifest),
    };
  }

  /**
   * Diff a specific published version against the version that was published
   * immediately before it. When no prior version exists (i.e., this is the
   * first published version), diffs against an empty manifest so everything
   * reads as "added" — giving CX a full view of what the framework contained
   * at its inception.
   */
  async getVersionDiff(frameworkId: string, versionId: string) {
    const current = await db.frameworkVersion.findUnique({ where: { id: versionId } });
    if (!current || current.frameworkId !== frameworkId) {
      throw new NotFoundException('Version not found');
    }

    const previous = await db.frameworkVersion.findFirst({
      where: { frameworkId, publishedAt: { lt: current.publishedAt } },
      orderBy: { publishedAt: 'desc' },
    });

    const toManifest = current.manifest as unknown as FrameworkManifest;
    const fromManifest: FrameworkManifest = previous
      ? (previous.manifest as unknown as FrameworkManifest)
      : {
          framework: toManifest.framework,
          requirements: [],
          controls: [],
          policies: [],
          tasks: [],
        };

    const diff = diffManifests(fromManifest, toManifest);

    return {
      version: { id: current.id, version: current.version, publishedAt: current.publishedAt, releaseNotes: current.releaseNotes },
      previousVersion: previous ? { id: previous.id, version: previous.version } : null,
      diff,
      linkChanges: resolveLinkChanges(diff, fromManifest, toManifest),
    };
  }
}

function resolveLinkChanges(
  diff: ReturnType<typeof diffManifests>,
  fromManifest: FrameworkManifest,
  toManifest: FrameworkManifest,
) {
  const nameFor = <K extends keyof FrameworkManifest>(
    key: K,
    id: string,
    fallback: string,
  ): { name: string; identifier?: string } => {
    const list = [
      ...(toManifest[key] as Array<{ id: string; name?: string; identifier?: string }>),
      ...(fromManifest[key] as Array<{ id: string; name?: string; identifier?: string }>),
    ];
    const hit = list.find((x) => x.id === id);
    return {
      name: hit?.name ?? fallback,
      identifier: hit?.identifier,
    };
  };

  return {
    controlRequirement: {
      added: diff.requirementMapEdges.added.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        requirementName: nameFor('requirements', e.requirementTemplateId, 'Unknown requirement').name,
        requirementIdentifier: nameFor('requirements', e.requirementTemplateId, '').identifier ?? '',
      })),
      removed: diff.requirementMapEdges.removed.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        requirementName: nameFor('requirements', e.requirementTemplateId, 'Unknown requirement').name,
        requirementIdentifier: nameFor('requirements', e.requirementTemplateId, '').identifier ?? '',
      })),
    },
    controlPolicy: {
      added: diff.controlPolicyEdges.added.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        policyName: nameFor('policies', e.policyTemplateId, 'Unknown policy').name,
      })),
      removed: diff.controlPolicyEdges.removed.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        policyName: nameFor('policies', e.policyTemplateId, 'Unknown policy').name,
      })),
    },
    controlTask: {
      added: diff.controlTaskEdges.added.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        taskName: nameFor('tasks', e.taskTemplateId, 'Unknown task').name,
      })),
      removed: diff.controlTaskEdges.removed.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        taskName: nameFor('tasks', e.taskTemplateId, 'Unknown task').name,
      })),
    },
    controlDocumentType: {
      added: diff.controlDocumentTypeEdges.added.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        formType: e.formType,
      })),
      removed: diff.controlDocumentTypeEdges.removed.map((e) => ({
        controlName: nameFor('controls', e.controlTemplateId, 'Unknown control').name,
        formType: e.formType,
      })),
    },
  };
}
