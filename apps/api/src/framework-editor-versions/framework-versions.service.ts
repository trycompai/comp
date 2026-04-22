import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { buildManifestForFramework } from './framework-manifest-builder';

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
        releaseNotes: true,
      },
    });
  }

  async get(frameworkId: string, versionId: string) {
    const v = await db.frameworkVersion.findUnique({ where: { id: versionId } });
    if (!v || v.frameworkId !== frameworkId) throw new NotFoundException('Version not found');
    return v;
  }
}
