import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db, Prisma, Frequency, Departments } from '@db';
import { lockOrganizationForSync } from './org-advisory-lock';
import { normalizeFormType } from './form-type-normalize';
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

    // Only the latest non-reversed sync can be rolled back. Rolling back an
    // older sync in the middle of a chain would leave the instance in an
    // inconsistent state (undo payloads only describe that single sync's
    // deltas and can't be stacked out of order).
    const newerActiveSync = await db.frameworkSyncOperation.findFirst({
      where: {
        frameworkInstanceId: syncOp.frameworkInstanceId,
        kind: 'SYNC',
        rolledBackByOperationId: null,
        performedAt: { gt: syncOp.performedAt },
      },
      select: { id: true, fromVersion: { select: { version: true } }, toVersion: { select: { version: true } } },
    });
    if (newerActiveSync) {
      throw new BadRequestException({
        message: `Only the most recent sync can be rolled back. Roll back v${newerActiveSync.fromVersion.version} → v${newerActiveSync.toVersion.version} first.`,
      });
    }

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

  // ControlDocumentType: reverse hard-deletes (recreate) and hard-delete
  // rows the sync created. Guarded against older sync ops that predate this
  // bucket shape.
  const cdt = ctx.undo.controlDocumentTypes ?? { created: [], deleted: [] };
  const cdtCreated = Array.isArray(cdt.created) ? cdt.created : [];
  const cdtDeleted = Array.isArray((cdt as { deleted?: unknown }).deleted)
    ? (cdt as { deleted: Array<{ controlId: string; formType: string }> }).deleted
    : [];
  if (cdtCreated.length) {
    await tx.controlDocumentType.deleteMany({ where: { id: { in: cdtCreated } } });
  }
  for (const d of cdtDeleted) {
    await tx.controlDocumentType.create({
      // Defensive normalization — older undo payloads may have stored the
      // DB-mapped hyphen form before the sync-apply normalization was added.
      data: { controlId: d.controlId, formType: normalizeFormType(d.formType) as never },
    });
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

  // Reverse implicit M:N edges: connects become disconnects and vice versa.
  // Guard with nullish coalescing so older sync operations written before
  // this bucket existed don't crash the rollback.
  //
  // Direct raw-SQL on the junction tables is idempotent by design:
  //   - INSERT … ON CONFLICT DO NOTHING tolerates edges that already exist
  //   - DELETE … WHERE (A,B) IN (…) tolerates edges that don't exist
  // Prisma 7's implicit-M:N `disconnect` is strict and throws P2025 when the
  // edge is missing for any reason (e.g., sync recorded a `connected` entry
  // for a connect that was already a no-op, or a manual edit removed the
  // edge between sync and rollback). Making rollback resilient here keeps
  // the 100%-reliable-undo guarantee we promise customers.
  const cpl = ctx.undo.controlPolicyLinks ?? { connected: [], disconnected: [] };
  const ctl = ctx.undo.controlTaskLinks ?? { connected: [], disconnected: [] };

  if (cpl.connected.length > 0) {
    const pairs = Prisma.join(
      cpl.connected.map(
        ({ controlId, otherId }) => Prisma.sql`(${controlId}::text, ${otherId}::text)`,
      ),
    );
    await tx.$executeRaw`DELETE FROM "_ControlToPolicy" WHERE ("A", "B") IN (${pairs})`;
  }
  if (cpl.disconnected.length > 0) {
    const rows = Prisma.join(
      cpl.disconnected.map(
        ({ controlId, otherId }) => Prisma.sql`(${controlId}::text, ${otherId}::text)`,
      ),
    );
    await tx.$executeRaw`INSERT INTO "_ControlToPolicy" ("A", "B") VALUES ${rows} ON CONFLICT ("A", "B") DO NOTHING`;
  }
  if (ctl.connected.length > 0) {
    const pairs = Prisma.join(
      ctl.connected.map(
        ({ controlId, otherId }) => Prisma.sql`(${controlId}::text, ${otherId}::text)`,
      ),
    );
    await tx.$executeRaw`DELETE FROM "_ControlToTask" WHERE ("A", "B") IN (${pairs})`;
  }
  if (ctl.disconnected.length > 0) {
    const rows = Prisma.join(
      ctl.disconnected.map(
        ({ controlId, otherId }) => Prisma.sql`(${controlId}::text, ${otherId}::text)`,
      ),
    );
    await tx.$executeRaw`INSERT INTO "_ControlToTask" ("A", "B") VALUES ${rows} ON CONFLICT ("A", "B") DO NOTHING`;
  }

  const scopedPolicyLinks = ctx.undo.frameworkControlPolicyLinks ?? {
    connected: [],
    disconnected: [],
  };
  const scopedTaskLinks = ctx.undo.frameworkControlTaskLinks ?? {
    connected: [],
    disconnected: [],
  };
  const scopedDocumentLinks = ctx.undo.frameworkControlDocumentTypeLinks ?? {
    connected: [],
    disconnected: [],
  };

  for (const link of scopedPolicyLinks.connected) {
    await tx.frameworkControlPolicyLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        policyId: link.otherId,
      },
    });
  }
  if (scopedPolicyLinks.disconnected.length > 0) {
    await tx.frameworkControlPolicyLink.createMany({
      data: scopedPolicyLinks.disconnected.map((link) => ({
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        policyId: link.otherId,
      })),
      skipDuplicates: true,
    });
  }

  for (const link of scopedTaskLinks.connected) {
    await tx.frameworkControlTaskLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        taskId: link.otherId,
      },
    });
  }
  if (scopedTaskLinks.disconnected.length > 0) {
    await tx.frameworkControlTaskLink.createMany({
      data: scopedTaskLinks.disconnected.map((link) => ({
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        taskId: link.otherId,
      })),
      skipDuplicates: true,
    });
  }

  for (const link of scopedDocumentLinks.connected) {
    await tx.frameworkControlDocumentTypeLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        formType: normalizeFormType(link.otherId) as never,
      },
    });
  }
  if (scopedDocumentLinks.disconnected.length > 0) {
    await tx.frameworkControlDocumentTypeLink.createMany({
      data: scopedDocumentLinks.disconnected.map((link) => ({
        frameworkInstanceId: ctx.syncOp.frameworkInstanceId,
        controlId: link.controlId,
        formType: normalizeFormType(link.otherId) as never,
      })),
      skipDuplicates: true,
    });
  }

  // Restore control families — guarded so older undo payloads without
  // this bucket don't break rollback.
  if (ctx.undo.controlFamilies) {
    for (const entry of ctx.undo.controlFamilies.created) {
      await tx.frameworkControlFamily.deleteMany({
        where: { frameworkInstanceId: entry.frameworkInstanceId, controlId: entry.controlId },
      });
    }
    for (const entry of ctx.undo.controlFamilies.updated) {
      await tx.frameworkControlFamily.upsert({
        where: { frameworkInstanceId_controlId: { frameworkInstanceId: entry.frameworkInstanceId, controlId: entry.controlId } },
        create: { frameworkInstanceId: entry.frameworkInstanceId, controlId: entry.controlId, controlFamily: entry.prevFamily },
        update: { controlFamily: entry.prevFamily },
      });
    }
    for (const entry of ctx.undo.controlFamilies.deleted) {
      await tx.frameworkControlFamily.upsert({
        where: { frameworkInstanceId_controlId: { frameworkInstanceId: entry.frameworkInstanceId, controlId: entry.controlId } },
        create: { frameworkInstanceId: entry.frameworkInstanceId, controlId: entry.controlId, controlFamily: entry.prevFamily },
        update: { controlFamily: entry.prevFamily },
      });
    }
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
