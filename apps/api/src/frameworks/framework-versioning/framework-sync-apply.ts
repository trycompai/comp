import { Prisma, Frequency, Departments, type FrameworkInstance, type FrameworkVersion } from '@db';
import { diffManifests } from './framework-diff';
import { isControlEdited, isPolicyEdited, isTaskEdited } from './framework-drift';
import { buildCrossFrameworkRefs } from './cross-framework-refs';
import { normalizeFormType } from './form-type-normalize';
import type { FrameworkManifest } from './manifest.types';
import type { UndoPayload, SyncSummary } from './undo-payload.types';

const ROLLBACK_WINDOW_DAYS = 14;

export type VersionWithManifest = Omit<FrameworkVersion, 'manifest'> & { manifest: FrameworkManifest };

export interface ApplySyncCtx {
  instance: FrameworkInstance;
  currentVersion: VersionWithManifest;
  targetVersion: VersionWithManifest;
  memberId: string;
}

export async function applySync(
  tx: Prisma.TransactionClient,
  ctx: ApplySyncCtx,
): Promise<{ syncOperationId: string }> {
  const from = ctx.currentVersion.manifest;
  const to = ctx.targetVersion.manifest;
  const diff = diffManifests(from, to);

  const allTemplateControlIds = new Set([...from.controls.map((c) => c.id), ...to.controls.map((c) => c.id)]);
  const allTemplatePolicyIds = new Set([...from.policies.map((p) => p.id), ...to.policies.map((p) => p.id)]);
  const allTemplateTaskIds = new Set([...from.tasks.map((t) => t.id), ...to.tasks.map((t) => t.id)]);

  const [instanceControls, instancePolicies, instanceTasks, otherInstances] = await Promise.all([
    tx.control.findMany({ where: { organizationId: ctx.instance.organizationId, controlTemplateId: { in: [...allTemplateControlIds] }, archivedAt: null } }),
    tx.policy.findMany({ where: { organizationId: ctx.instance.organizationId, policyTemplateId: { in: [...allTemplatePolicyIds] }, archivedAt: null } }),
    tx.task.findMany({ where: { organizationId: ctx.instance.organizationId, taskTemplateId: { in: [...allTemplateTaskIds] }, archivedAt: null } }),
    tx.frameworkInstance.findMany({
      where: { organizationId: ctx.instance.organizationId, id: { not: ctx.instance.id } },
      include: { currentVersion: true },
    }),
  ]);

  const ctlByTemplate = new Map(instanceControls.filter((c) => c.controlTemplateId).map((c) => [c.controlTemplateId!, c]));
  const polByTemplate = new Map(instancePolicies.filter((p) => p.policyTemplateId).map((p) => [p.policyTemplateId!, p]));
  const taskByTemplate = new Map(instanceTasks.filter((t) => t.taskTemplateId).map((t) => [t.taskTemplateId!, t]));

  const refs = buildCrossFrameworkRefs({
    otherInstances: otherInstances
      .filter((i) => i.currentVersion)
      .map((i) => ({ frameworkInstanceId: i.id, manifest: i.currentVersion!.manifest as unknown as FrameworkManifest })),
  });

  const undo: UndoPayload = {
    controls: { created: [], archived: [], contentUpdated: [] },
    policies: { created: [], archived: [], contentUpdated: [], draftsAdded: [] },
    tasks: { created: [], archived: [], contentUpdated: [] },
    requirementMaps: { created: [], archived: [] },
    controlDocumentTypes: { created: [], deleted: [] },
    controlPolicyLinks: { connected: [], disconnected: [] },
    controlTaskLinks: { connected: [], disconnected: [] },
    frameworkControlPolicyLinks: { connected: [], disconnected: [] },
    frameworkControlTaskLinks: { connected: [], disconnected: [] },
    frameworkControlDocumentTypeLinks: { connected: [], disconnected: [] },
  };
  const summary: SyncSummary = {
    controlsAdded: 0, controlsArchived: 0, controlsUpdatedApplied: 0, controlsUpdatedPreserved: 0,
    policiesAdded: 0, policiesArchived: 0, policiesUpdatedApplied: 0, policiesUpdatedPreserved: 0, policiesDraftAdded: 0,
    tasksAdded: 0, tasksArchived: 0, tasksUpdatedApplied: 0, tasksUpdatedPreserved: 0,
    requirementMapsAdded: 0, requirementMapsArchived: 0,
    controlDocumentTypesAdded: 0, controlDocumentTypesArchived: 0,
  };

  // --- Controls ---
  for (const targetControl of to.controls) {
    if (ctlByTemplate.has(targetControl.id)) continue;
    const created = await tx.control.create({
      data: {
        organizationId: ctx.instance.organizationId,
        controlTemplateId: targetControl.id,
        name: targetControl.name,
        description: targetControl.description,
        controlFamily: targetControl.controlFamily ?? null,
      },
    });
    ctlByTemplate.set(targetControl.id, created);
    undo.controls.created.push(created.id);
    summary.controlsAdded += 1;
  }
  for (const removed of diff.controls.removed) {
    const inst = ctlByTemplate.get(removed.id);
    if (!inst) continue;
    if (refs.controlTemplateIds.has(removed.id)) continue;
    const prev = inst.archivedAt;
    await tx.control.update({ where: { id: inst.id }, data: { archivedAt: new Date() } });
    undo.controls.archived.push({ id: inst.id, prevArchivedAt: prev });
    summary.controlsArchived += 1;
  }
  for (const u of diff.controls.updated) {
    const inst = ctlByTemplate.get(u.id);
    if (!inst) continue;
    if (isControlEdited(inst, u.from)) {
      summary.controlsUpdatedPreserved += 1;
      continue;
    }
    undo.controls.contentUpdated.push({ id: inst.id, prevContent: { name: inst.name, description: inst.description, controlFamily: inst.controlFamily } });
    await tx.control.update({ where: { id: inst.id }, data: { name: u.to.name, description: u.to.description, controlFamily: u.to.controlFamily ?? null } });
    summary.controlsUpdatedApplied += 1;
  }

  // --- Tasks ---
  for (const targetTask of to.tasks) {
    if (taskByTemplate.has(targetTask.id)) continue;
    const created = await tx.task.create({
      data: {
        organizationId: ctx.instance.organizationId,
        taskTemplateId: targetTask.id,
        title: targetTask.name,
        description: targetTask.description,
        frequency: targetTask.frequency as Frequency | null,
        department: targetTask.department as Departments | null,
      },
    });
    taskByTemplate.set(targetTask.id, created);
    undo.tasks.created.push(created.id);
    summary.tasksAdded += 1;
  }
  for (const removed of diff.tasks.removed) {
    const inst = taskByTemplate.get(removed.id);
    if (!inst) continue;
    if (refs.taskTemplateIds.has(removed.id)) continue;
    const prev = inst.archivedAt;
    await tx.task.update({ where: { id: inst.id }, data: { archivedAt: new Date() } });
    undo.tasks.archived.push({ id: inst.id, prevArchivedAt: prev });
    summary.tasksArchived += 1;
  }
  for (const u of diff.tasks.updated) {
    const inst = taskByTemplate.get(u.id);
    if (!inst) continue;
    if (isTaskEdited(inst, u.from)) {
      summary.tasksUpdatedPreserved += 1;
      continue;
    }
    undo.tasks.contentUpdated.push({
      id: inst.id,
      prevContent: { title: inst.title, description: inst.description, frequency: inst.frequency, department: inst.department },
    });
    await tx.task.update({
      where: { id: inst.id },
      data: { title: u.to.name, description: u.to.description, frequency: u.to.frequency as Frequency | null, department: u.to.department as Departments | null },
    });
    summary.tasksUpdatedApplied += 1;
  }

  // --- Policies ---
  for (const added of diff.policies.added) {
    if (polByTemplate.has(added.id)) continue;
    const contentArray = toJsonArray(added.content);
    const policyCreated = await tx.policy.create({
      data: {
        organizationId: ctx.instance.organizationId,
        policyTemplateId: added.id,
        name: added.name,
        description: added.description,
        content: { set: contentArray },
        frequency: added.frequency as Frequency | null,
        department: added.department as Departments | null,
        status: 'draft',
      },
    });

    // Create the initial draft PolicyVersion. Cascades on Policy delete, so
    // rollback only needs to hard-delete the Policy row (undo.policies.created).
    await tx.policyVersion.create({
      data: {
        policyId: policyCreated.id,
        version: 1,
        content: { set: contentArray },
        changelog: 'Initial draft from framework template',
      },
    });

    polByTemplate.set(added.id, policyCreated);
    undo.policies.created.push(policyCreated.id);
    summary.policiesAdded += 1;
  }
  for (const removed of diff.policies.removed) {
    const inst = polByTemplate.get(removed.id);
    if (!inst) continue;
    if (refs.policyTemplateIds.has(removed.id)) continue;
    const prev = inst.archivedAt;
    await tx.policy.update({ where: { id: inst.id }, data: { archivedAt: new Date() } });
    undo.policies.archived.push({ id: inst.id, prevArchivedAt: prev });
    summary.policiesArchived += 1;
  }
  for (const u of diff.policies.updated) {
    const inst = polByTemplate.get(u.id);
    if (!inst) continue;
    if (inst.status === 'published') {
      const latest = await tx.policyVersion.findFirst({ where: { policyId: inst.id }, orderBy: { version: 'desc' }, select: { version: true } });
      const nextVersion = (latest?.version ?? 0) + 1;
      const draft = await tx.policyVersion.create({
        data: { policyId: inst.id, version: nextVersion, content: { set: toJsonArray(u.to.content) }, changelog: 'Template update available' },
      });
      undo.policies.draftsAdded.push({ policyId: inst.id, draftVersionId: draft.id });
      summary.policiesDraftAdded += 1;
      continue;
    }
    if (isPolicyEdited(inst, u.from)) {
      summary.policiesUpdatedPreserved += 1;
      continue;
    }
    undo.policies.contentUpdated.push({
      id: inst.id,
      prevContent: { name: inst.name, description: inst.description, content: inst.content, frequency: inst.frequency, department: inst.department },
    });
    await tx.policy.update({
      where: { id: inst.id },
      data: { name: u.to.name, description: u.to.description, content: { set: toJsonArray(u.to.content) }, frequency: u.to.frequency as Frequency | null, department: u.to.department as Departments | null },
    });
    summary.policiesUpdatedApplied += 1;
  }

  // --- RequirementMap edges ---
  // Reconcile every edge declared by the to-manifest with the customer's
  // RequirementMap rows, instead of only applying the v1→v2 diff. Diff alone
  // misses edges the backfilled v1.0.0 manifest claimed exist but the
  // customer's actual rows never had — drift introduced when CX added a
  // control↔requirement link between the customer's onboarding and the
  // backfill. The to-manifest is authoritative for what a v2-pinned customer
  // should see, regardless of what v1 said.
  //
  // Query both active and archived rows because the unique constraint
  // (controlId, frameworkInstanceId, requirementId) ignores archivedAt — a
  // plain `create` over an archived row would violate it. If a row exists
  // archived, unarchive it instead.
  const existingEdges = await tx.requirementMap.findMany({
    where: { frameworkInstanceId: ctx.instance.id },
    select: { id: true, controlId: true, requirementId: true, archivedAt: true },
  });
  const keyOf = (controlId: string, requirementId: string) => `${controlId}::${requirementId}`;
  const existingByKey = new Map(
    existingEdges.filter((e) => e.requirementId).map((e) => [keyOf(e.controlId, e.requirementId!), e]),
  );

  const toReqIds = new Set(to.requirements.map((r) => r.id));
  for (const c of to.controls) {
    const ctlInst = ctlByTemplate.get(c.id);
    if (!ctlInst) continue;
    for (const rid of c.requirementIds) {
      // Strip cross-framework refs the same way the diff sanitizer does.
      if (!toReqIds.has(rid)) continue;
      const key = keyOf(ctlInst.id, rid);
      const existing = existingByKey.get(key);
      if (existing) {
        if (existing.archivedAt === null) continue;
        // Unarchive — the row exists from a prior sync that archived it,
        // and to-manifest wants it back.
        const prevArchivedAt = existing.archivedAt;
        await tx.requirementMap.update({
          where: { id: existing.id },
          data: { archivedAt: null },
        });
        existing.archivedAt = null;
        undo.requirementMaps.archived.push({ id: existing.id, prevArchivedAt });
        summary.requirementMapsAdded += 1;
        continue;
      }
      const created = await tx.requirementMap.create({
        data: {
          frameworkInstanceId: ctx.instance.id,
          controlId: ctlInst.id,
          requirementId: rid,
        },
      });
      existingByKey.set(key, {
        id: created.id,
        controlId: ctlInst.id,
        requirementId: rid,
        archivedAt: null,
      });
      undo.requirementMaps.created.push(created.id);
      summary.requirementMapsAdded += 1;
    }
  }

  // Archive edges still claimed by v1 but absent from v2.
  for (const edge of diff.requirementMapEdges.removed) {
    const ctlInst = ctlByTemplate.get(edge.controlTemplateId);
    if (!ctlInst) continue;
    const existing = existingByKey.get(keyOf(ctlInst.id, edge.requirementTemplateId));
    if (!existing || existing.archivedAt !== null) continue;
    await tx.requirementMap.updateMany({
      where: { id: existing.id, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    undo.requirementMaps.archived.push({ id: existing.id, prevArchivedAt: null });
    summary.requirementMapsArchived += 1;
  }

  // --- Control<->Policy / Control<->Task relations (Prisma implicit M:N) ---
  // Same drift story as RequirementMap: reconcile against to-manifest, not
  // just diff. These tables are org-scoped (shared across frameworks), so we
  // only ADD missing edges — removing extras would clobber edges another
  // framework still wants. Pre-check existence so undo records only edges
  // this sync actually created (otherwise rollback would delete a pre-
  // existing edge that a different framework's onboarding had created).
  const ctlInstIds = Array.from(ctlByTemplate.values()).map((c) => c.id);

  const existingCp =
    ctlInstIds.length > 0
      ? await tx.$queryRaw<Array<{ A: string; B: string }>>`
          SELECT "A", "B" FROM "_ControlToPolicy"
          WHERE "A" IN (${Prisma.join(ctlInstIds)})
        `
      : [];
  const existingCpKey = new Set(existingCp.map((r) => `${r.A}::${r.B}`));
  const existingScopedCp = await tx.frameworkControlPolicyLink.findMany({
    where: { frameworkInstanceId: ctx.instance.id, controlId: { in: ctlInstIds } },
    select: { controlId: true, policyId: true },
  });
  const existingScopedCpKey = new Set(
    existingScopedCp.map((r) => `${r.controlId}::${r.policyId}`),
  );

  const cpAdded: Array<{ controlId: string; policyId: string }> = [];
  const scopedCpAdded: Array<{ controlId: string; policyId: string }> = [];
  for (const c of to.controls) {
    const ctlInst = ctlByTemplate.get(c.id);
    if (!ctlInst) continue;
    for (const pid of c.policyIds) {
      const polInst = polByTemplate.get(pid);
      if (!polInst) continue;
      const key = `${ctlInst.id}::${polInst.id}`;
      if (!existingScopedCpKey.has(key)) {
        scopedCpAdded.push({ controlId: ctlInst.id, policyId: polInst.id });
        undo.frameworkControlPolicyLinks?.connected.push({
          controlId: ctlInst.id,
          otherId: polInst.id,
        });
        existingScopedCpKey.add(key);
      }
      if (existingCpKey.has(key)) continue;
      cpAdded.push({ controlId: ctlInst.id, policyId: polInst.id });
      undo.controlPolicyLinks.connected.push({ controlId: ctlInst.id, otherId: polInst.id });
      existingCpKey.add(key);
    }
  }
  if (scopedCpAdded.length > 0) {
    await tx.frameworkControlPolicyLink.createMany({
      data: scopedCpAdded.map(({ controlId, policyId }) => ({
        frameworkInstanceId: ctx.instance.id,
        controlId,
        policyId,
      })),
      skipDuplicates: true,
    });
  }
  if (cpAdded.length > 0) {
    const rows = Prisma.join(
      cpAdded.map(({ controlId, policyId }) => Prisma.sql`(${controlId}::text, ${policyId}::text)`),
    );
    await tx.$executeRaw`INSERT INTO "_ControlToPolicy" ("A", "B") VALUES ${rows} ON CONFLICT ("A", "B") DO NOTHING`;
  }

  // Diff-based removal: only edges v1 claimed and v2 dropped.
  for (const edge of diff.controlPolicyEdges.removed) {
    const ctlInst = ctlByTemplate.get(edge.controlTemplateId);
    const polInst = polByTemplate.get(edge.policyTemplateId);
    if (!ctlInst || !polInst) continue;
    const deleted = await tx.frameworkControlPolicyLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.instance.id,
        controlId: ctlInst.id,
        policyId: polInst.id,
      },
    });
    if (deleted.count > 0) {
      undo.frameworkControlPolicyLinks?.disconnected.push({
        controlId: ctlInst.id,
        otherId: polInst.id,
      });
    }
  }

  const existingCt =
    ctlInstIds.length > 0
      ? await tx.$queryRaw<Array<{ A: string; B: string }>>`
          SELECT "A", "B" FROM "_ControlToTask"
          WHERE "A" IN (${Prisma.join(ctlInstIds)})
        `
      : [];
  const existingCtKey = new Set(existingCt.map((r) => `${r.A}::${r.B}`));
  const existingScopedCt = await tx.frameworkControlTaskLink.findMany({
    where: { frameworkInstanceId: ctx.instance.id, controlId: { in: ctlInstIds } },
    select: { controlId: true, taskId: true },
  });
  const existingScopedCtKey = new Set(
    existingScopedCt.map((r) => `${r.controlId}::${r.taskId}`),
  );

  const ctAdded: Array<{ controlId: string; taskId: string }> = [];
  const scopedCtAdded: Array<{ controlId: string; taskId: string }> = [];
  for (const c of to.controls) {
    const ctlInst = ctlByTemplate.get(c.id);
    if (!ctlInst) continue;
    for (const tid of c.taskIds) {
      const tInst = taskByTemplate.get(tid);
      if (!tInst) continue;
      const key = `${ctlInst.id}::${tInst.id}`;
      if (!existingScopedCtKey.has(key)) {
        scopedCtAdded.push({ controlId: ctlInst.id, taskId: tInst.id });
        undo.frameworkControlTaskLinks?.connected.push({
          controlId: ctlInst.id,
          otherId: tInst.id,
        });
        existingScopedCtKey.add(key);
      }
      if (existingCtKey.has(key)) continue;
      ctAdded.push({ controlId: ctlInst.id, taskId: tInst.id });
      undo.controlTaskLinks.connected.push({ controlId: ctlInst.id, otherId: tInst.id });
      existingCtKey.add(key);
    }
  }
  if (scopedCtAdded.length > 0) {
    await tx.frameworkControlTaskLink.createMany({
      data: scopedCtAdded.map(({ controlId, taskId }) => ({
        frameworkInstanceId: ctx.instance.id,
        controlId,
        taskId,
      })),
      skipDuplicates: true,
    });
  }
  if (ctAdded.length > 0) {
    const rows = Prisma.join(
      ctAdded.map(({ controlId, taskId }) => Prisma.sql`(${controlId}::text, ${taskId}::text)`),
    );
    await tx.$executeRaw`INSERT INTO "_ControlToTask" ("A", "B") VALUES ${rows} ON CONFLICT ("A", "B") DO NOTHING`;
  }

  for (const edge of diff.controlTaskEdges.removed) {
    const ctlInst = ctlByTemplate.get(edge.controlTemplateId);
    const tInst = taskByTemplate.get(edge.taskTemplateId);
    if (!ctlInst || !tInst) continue;
    const deleted = await tx.frameworkControlTaskLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.instance.id,
        controlId: ctlInst.id,
        taskId: tInst.id,
      },
    });
    if (deleted.count > 0) {
      undo.frameworkControlTaskLinks?.disconnected.push({
        controlId: ctlInst.id,
        otherId: tInst.id,
      });
    }
  }

  // --- Control <-> DocumentType (explicit junction table ControlDocumentType) ---
  // formType is an enum; uniqueness is on (controlId, formType). Same drift
  // story as the other edge types — reconcile against to-manifest, not just
  // diff.added, so customers missing rows the v1 manifest already claimed
  // get them on sync. Removals stay diff-based (this table has no archivedAt
  // and the row is shared across frameworks, so we should only hard-delete
  // when the to-manifest explicitly drops it).
  for (const c of to.controls) {
    const ctlInst = ctlByTemplate.get(c.id);
    if (!ctlInst) continue;
    for (const rawFormType of c.documentTypes ?? []) {
      const formType = normalizeFormType(rawFormType);
      const scopedExisting = await tx.frameworkControlDocumentTypeLink.findUnique({
        where: {
          frameworkInstanceId_controlId_formType: {
            frameworkInstanceId: ctx.instance.id,
            controlId: ctlInst.id,
            formType: formType as never,
          },
        },
        select: { id: true },
      });
      if (!scopedExisting) {
        await tx.frameworkControlDocumentTypeLink.create({
          data: {
            frameworkInstanceId: ctx.instance.id,
            controlId: ctlInst.id,
            formType: formType as never,
          },
        });
        undo.frameworkControlDocumentTypeLinks?.connected.push({
          controlId: ctlInst.id,
          otherId: formType,
        });
      }
      const existing = await tx.controlDocumentType.findUnique({
        where: { controlId_formType: { controlId: ctlInst.id, formType: formType as never } },
        select: { id: true },
      });
      if (existing) continue;
      const created = await tx.controlDocumentType.create({
        data: { controlId: ctlInst.id, formType: formType as never },
      });
      undo.controlDocumentTypes.created.push(created.id);
      summary.controlDocumentTypesAdded += 1;
    }
  }
  for (const edge of diff.controlDocumentTypeEdges.removed) {
    const ctlInst = ctlByTemplate.get(edge.controlTemplateId);
    if (!ctlInst) continue;
    const formType = normalizeFormType(edge.formType);
    const deleted = await tx.frameworkControlDocumentTypeLink.deleteMany({
      where: {
        frameworkInstanceId: ctx.instance.id,
        controlId: ctlInst.id,
        formType: formType as never,
      },
    });
    if (deleted.count > 0) {
      undo.frameworkControlDocumentTypeLinks?.disconnected.push({
        controlId: ctlInst.id,
        otherId: formType,
      });
      summary.controlDocumentTypesArchived += 1;
    }
  }

  // --- Persist sync op + update currentVersionId ---
  const syncOp = await tx.frameworkSyncOperation.create({
    data: {
      frameworkInstanceId: ctx.instance.id,
      fromVersionId: ctx.currentVersion.id,
      toVersionId: ctx.targetVersion.id,
      kind: 'SYNC',
      performedById: ctx.memberId,
      rollbackExpiresAt: addDays(new Date(), ROLLBACK_WINDOW_DAYS),
      undoPayload: undo as unknown as object,
      summary: summary as unknown as object,
    },
  });

  await tx.frameworkInstance.update({
    where: { id: ctx.instance.id },
    data: { currentVersionId: ctx.targetVersion.id },
  });

  return { syncOperationId: syncOp.id };
}

/**
 * Normalize opaque manifest content (either a single JSON object or an array
 * of them — templates are single-object, customer Policy.content is Json[])
 * into an InputJsonValue[] for Prisma writes.
 */
function toJsonArray(value: unknown): Prisma.InputJsonValue[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as Prisma.InputJsonValue[];
  return [value as Prisma.InputJsonValue];
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}
