import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { applySync, type VersionWithManifest } from './framework-sync-apply';
import { lockOrganizationForSync } from './org-advisory-lock';

export interface SyncParams {
  organizationId: string;
  frameworkInstanceId: string;
  targetVersionId: string;
  memberId: string;
}

export type SyncResult =
  | { kind: 'no-op'; frameworkInstanceId: string }
  | { kind: 'synced'; frameworkInstanceId: string; syncOperationId: string };

@Injectable()
export class FrameworkSyncService {
  async sync(params: SyncParams): Promise<SyncResult> {
    // Cheap pre-lock check to short-circuit the obvious no-op without a tx.
    // The authoritative check happens inside the lock below.
    const precheck = await db.frameworkInstance.findUnique({
      where: { id: params.frameworkInstanceId },
      select: { id: true, organizationId: true, currentVersionId: true },
    });
    if (!precheck) throw new NotFoundException('Framework instance not found');
    if (precheck.organizationId !== params.organizationId) {
      throw new ForbiddenException('Wrong organization');
    }
    if (precheck.currentVersionId === params.targetVersionId) {
      return { kind: 'no-op', frameworkInstanceId: precheck.id };
    }

    // Acquire the lock BEFORE reading instance/version state. Two concurrent
    // syncs both passing a pre-lock validation on a shared `currentVersionId`
    // would allow the second one to run applySync against a stale baseline.
    const { syncOperationId, instanceId } = await db.$transaction(async (tx) => {
      await lockOrganizationForSync(tx, params.organizationId);

      const instance = await tx.frameworkInstance.findUnique({
        where: { id: params.frameworkInstanceId },
      });
      if (!instance) throw new NotFoundException('Framework instance not found');
      if (instance.organizationId !== params.organizationId) {
        throw new ForbiddenException('Wrong organization');
      }
      if (instance.currentVersionId === params.targetVersionId) {
        return { syncOperationId: null, instanceId: instance.id };
      }

      const [currentVersion, targetVersion] = await Promise.all([
        instance.currentVersionId
          ? tx.frameworkVersion.findUnique({ where: { id: instance.currentVersionId } })
          : null,
        tx.frameworkVersion.findUnique({ where: { id: params.targetVersionId } }),
      ]);
      if (!targetVersion) throw new NotFoundException('Target version not found');
      if (!currentVersion) {
        throw new BadRequestException('Instance is not on any version; backfill v1.0.0 first');
      }
      if (currentVersion.frameworkId !== instance.frameworkId) {
        throw new BadRequestException('Version / framework mismatch');
      }
      if (targetVersion.frameworkId !== instance.frameworkId) {
        throw new BadRequestException('Target version belongs to a different framework');
      }

      const result = await applySync(tx, {
        instance,
        currentVersion: currentVersion as unknown as VersionWithManifest,
        targetVersion: targetVersion as unknown as VersionWithManifest,
        memberId: params.memberId,
      });
      return { syncOperationId: result.syncOperationId, instanceId: instance.id };
    });

    if (syncOperationId === null) {
      return { kind: 'no-op', frameworkInstanceId: instanceId };
    }
    return { kind: 'synced', frameworkInstanceId: instanceId, syncOperationId };
  }
}
