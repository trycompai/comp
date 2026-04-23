import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db, Prisma, Frequency, Departments } from '@db';
import { lockOrganizationForSync } from './org-advisory-lock';
import type { UndoPayload } from './undo-payload.types';

export interface RollbackParams {
  organizationId: string;
  frameworkInstanceId: string;
  syncOperationId: string;
  memberId: string;
}

export interface RollbackResult {
  rollbackOperationId: string;
}

@Injectable()
export class FrameworkRollbackService {
  async rollback(params: RollbackParams): Promise<RollbackResult> {
    const syncOp = await db.frameworkSyncOperation.findUnique({
      where: { id: params.syncOperationId },
      include: { frameworkInstance: true },
    });
    if (!syncOp) throw new NotFoundException('Sync operation not found');
    if (syncOp.frameworkInstance.organizationId !== params.organizationId) throw new ForbiddenException('Wrong organization');
    if (syncOp.frameworkInstanceId !== params.frameworkInstanceId) throw new BadRequestException('Sync op does not belong to this framework instance');
    if (syncOp.kind !== 'SYNC') throw new BadRequestException('Only sync operations can be rolled back');
    if (syncOp.rolledBackByOperationId) throw new BadRequestException('Sync has already been rolled back');
    if (!syncOp.rollbackExpiresAt || syncOp.rollbackExpiresAt <= new Date()) throw new BadRequestException('Rollback window has expired');

    const undo = syncOp.undoPayload as unknown as UndoPayload;

    await assertNoDataLoss(undo);

    const rollbackOp = await db.$transaction(async (tx) => {
      await lockOrganizationForSync(tx, params.organizationId);
      return replayUndo(tx, { syncOp, undo, memberId: params.memberId });
    });

    return { rollbackOperationId: rollbackOp.id };
  }
}

async function assertNoDataLoss(undo: UndoPayload): Promise<void> {
  if (undo.tasks.created.length > 0) {
    const completed = await db.task.findMany({
      where: { id: { in: undo.tasks.created }, status: 'done' },
      select: { id: true, title: true },
    });
    if (completed.length > 0) {
      throw new BadRequestException({
        message: 'Rollback would cause data loss: tasks have been completed since the sync.',
        details: completed,
      });
    }
  }
  if (undo.policies.created.length > 0) {
    const published = await db.policy.findMany({
      where: { id: { in: undo.policies.created }, status: 'published' as const },
      select: { id: true, name: true },
    });
    if (published.length > 0) {
      throw new BadRequestException({
        message: 'Rollback would cause data loss: policies have been published since the sync.',
        details: published,
      });
    }
  }
}

interface ReplayUndoCtx {
  syncOp: {
    id: string;
    frameworkInstanceId: string;
    fromVersionId: string;
    toVersionId: string;
  };
  undo: UndoPayload;
  memberId: string;
}

async function replayUndo(
  tx: Prisma.TransactionClient,
  ctx: ReplayUndoCtx,
): Promise<{ id: string }> {
  // Hard-delete rows created by the sync
  if (ctx.undo.controls.created.length) {
    await tx.control.deleteMany({ where: { id: { in: ctx.undo.controls.created } } });
  }
  if (ctx.undo.tasks.created.length) {
    await tx.task.deleteMany({ where: { id: { in: ctx.undo.tasks.created } } });
  }
  if (ctx.undo.policies.created.length) {
    await tx.policy.deleteMany({ where: { id: { in: ctx.undo.policies.created } } });
  }
  if (ctx.undo.requirementMaps.created.length) {
    await tx.requirementMap.deleteMany({ where: { id: { in: ctx.undo.requirementMaps.created } } });
  }

  // Restore archived state
  for (const a of ctx.undo.controls.archived) {
    await tx.control.update({ where: { id: a.id }, data: { archivedAt: a.prevArchivedAt } });
  }
  for (const a of ctx.undo.tasks.archived) {
    await tx.task.update({ where: { id: a.id }, data: { archivedAt: a.prevArchivedAt } });
  }
  for (const a of ctx.undo.policies.archived) {
    await tx.policy.update({ where: { id: a.id }, data: { archivedAt: a.prevArchivedAt } });
  }
  for (const a of ctx.undo.requirementMaps.archived) {
    await tx.requirementMap.update({ where: { id: a.id }, data: { archivedAt: a.prevArchivedAt } });
  }

  // Restore previous content
  for (const u of ctx.undo.controls.contentUpdated) {
    await tx.control.update({
      where: { id: u.id },
      data: { name: u.prevContent.name, description: u.prevContent.description },
    });
  }
  for (const u of ctx.undo.tasks.contentUpdated) {
    await tx.task.update({
      where: { id: u.id },
      data: {
        title: u.prevContent.title,
        description: u.prevContent.description,
        frequency: u.prevContent.frequency as Frequency | null,
        department: u.prevContent.department as Departments | null,
      },
    });
  }
  for (const u of ctx.undo.policies.contentUpdated) {
    await tx.policy.update({
      where: { id: u.id },
      data: {
        name: u.prevContent.name,
        description: u.prevContent.description,
        content: {
          set: Array.isArray(u.prevContent.content)
            ? (u.prevContent.content as unknown as Prisma.InputJsonValue[])
            : [u.prevContent.content as unknown as Prisma.InputJsonValue],
        },
        frequency: u.prevContent.frequency as Frequency | null,
        department: u.prevContent.department as Departments | null,
      },
    });
  }

  // Remove draft policy versions added by the sync
  for (const d of ctx.undo.policies.draftsAdded) {
    await tx.policyVersion.delete({ where: { id: d.draftVersionId } });
  }

  // Revert framework instance version pointer
  await tx.frameworkInstance.update({
    where: { id: ctx.syncOp.frameworkInstanceId },
    data: { currentVersionId: ctx.syncOp.fromVersionId },
  });

  // Create the rollback operation record
  const rb = await tx.frameworkSyncOperation.create({
    data: {
      frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
      fromVersionId: ctx.syncOp.toVersionId,
      toVersionId: ctx.syncOp.fromVersionId,
      kind: 'ROLLBACK',
      performedById: ctx.memberId,
      rollbackExpiresAt: null,
      undoPayload: {} as unknown as object,
      summary: { reversedSyncOperationId: ctx.syncOp.id } as unknown as object,
    },
  });

  // Mark the original sync as rolled back
  await tx.frameworkSyncOperation.update({
    where: { id: ctx.syncOp.id },
    data: { rolledBackByOperationId: rb.id },
  });

  return rb;
}
