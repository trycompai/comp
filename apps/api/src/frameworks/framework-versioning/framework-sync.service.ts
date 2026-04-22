import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { applySync, type VersionWithManifest } from './framework-sync-apply';
import { lockOrganizationForSync } from './org-advisory-lock';

export interface SyncParams {
  organizationId: string;
  frameworkInstanceId: string;
  targetVersionId: string;
  userId: string;
}

export type SyncResult =
  | { kind: 'no-op'; frameworkInstanceId: string }
  | { kind: 'synced'; frameworkInstanceId: string; syncOperationId: string };

@Injectable()
export class FrameworkSyncService {
  async sync(params: SyncParams): Promise<SyncResult> {
    const instance = await db.frameworkInstance.findUnique({ where: { id: params.frameworkInstanceId } });
    if (!instance) throw new NotFoundException('Framework instance not found');
    if (instance.organizationId !== params.organizationId) throw new ForbiddenException('Wrong organization');

    if (instance.currentVersionId === params.targetVersionId) {
      return { kind: 'no-op', frameworkInstanceId: instance.id };
    }

    const [currentVersion, targetVersion] = await Promise.all([
      instance.currentVersionId ? db.frameworkVersion.findUnique({ where: { id: instance.currentVersionId } }) : null,
      db.frameworkVersion.findUnique({ where: { id: params.targetVersionId } }),
    ]);
    if (!targetVersion) throw new NotFoundException('Target version not found');
    if (!currentVersion) throw new BadRequestException('Instance is not on any version; backfill v1.0.0 first');
    if (currentVersion.frameworkId !== instance.frameworkId) throw new BadRequestException('Version / framework mismatch');
    if (targetVersion.frameworkId !== instance.frameworkId) throw new BadRequestException('Target version belongs to a different framework');

    const { syncOperationId } = await db.$transaction(async (tx) => {
      await lockOrganizationForSync(tx, params.organizationId);
      return applySync(tx, {
        instance,
        currentVersion: currentVersion as unknown as VersionWithManifest,
        targetVersion: targetVersion as unknown as VersionWithManifest,
        userId: params.userId,
      });
    });

    return { kind: 'synced', frameworkInstanceId: instance.id, syncOperationId };
  }
}
