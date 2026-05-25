import { Prisma } from '@db';
import { loadFrameworkSources } from './frameworks-source-loader.helper';

/**
 * Unwraps a `{ set: [...] }` wrapper that was incorrectly stored by a
 * previous createMany bug for Json[] fields. Returns the inner array if
 * the pattern is detected, otherwise returns the original value.
 * Filters null entries and returns InputJsonValue[] for createMany compatibility.
 */
function sanitizeJsonContent(
  value: Prisma.JsonValue | Prisma.JsonValue[],
): Prisma.InputJsonValue[] {
  let arr: Prisma.JsonValue[] = Array.isArray(value) ? value : [value];

  if (
    arr.length === 1 &&
    arr[0] &&
    typeof arr[0] === 'object' &&
    !Array.isArray(arr[0]) &&
    'set' in arr[0] &&
    Array.isArray(arr[0].set)
  ) {
    arr = arr[0].set as Prisma.JsonValue[];
  }

  // JsonValue and InputJsonValue are runtime-identical; only difference
  // is the null union member which we filter out here.
  const filtered: unknown[] = arr.filter((v) => v != null);
  return filtered as Prisma.InputJsonValue[];
}

type FrameworkEditorFrameworkWithRequirements =
  Prisma.FrameworkEditorFrameworkGetPayload<{
    include: { requirements: true };
  }>;

export interface UpsertOrgFrameworkStructureInput {
  organizationId: string;
  targetFrameworkEditorIds: string[];
  frameworkEditorFrameworks: FrameworkEditorFrameworkWithRequirements[];
  tx: Prisma.TransactionClient;
}

export async function upsertOrgFrameworkStructure({
  organizationId,
  targetFrameworkEditorIds,
  frameworkEditorFrameworks,
  tx,
}: UpsertOrgFrameworkStructureInput) {
  // Source data comes from each framework's pinned FrameworkVersion.manifest
  // so a new org is aligned with the version it's about to be pinned to —
  // not with whatever CX is editing live. Frameworks without a published
  // version fall back to live templates (with a warning).
  const sources = await loadFrameworkSources({
    frameworkEditorIds: targetFrameworkEditorIds,
    frameworkEditorFrameworks,
    tx,
  });

  for (const fid of sources.frameworksWithoutVersion) {
    console.warn(
      `upsertOrgFrameworkStructure: no FrameworkVersion for framework ${fid} — falling back to live templates and pinning currentVersionId=null. Publish v1.0.0 in the framework editor.`,
    );
  }

  const {
    controlTemplates,
    policyTemplates,
    taskTemplates,
    groupedRelations,
    latestVersionByFrameworkId,
    requirementToFrameworkId,
  } = sources;

  const controlTemplateIds = controlTemplates.map((c) => c.id);
  const policyTemplateIds = policyTemplates.map((p) => p.id);
  const taskTemplateIds = taskTemplates.map((t) => t.id);

  // Upsert framework instances
  const existingInstances = await tx.frameworkInstance.findMany({
    where: {
      organizationId,
      frameworkId: { in: targetFrameworkEditorIds },
    },
    select: { frameworkId: true },
  });
  const existingFrameworkIds = new Set(
    existingInstances.map((fi) => fi.frameworkId),
  );

  const instancesToCreate = frameworkEditorFrameworks
    .filter(
      (f) =>
        targetFrameworkEditorIds.includes(f.id) &&
        !existingFrameworkIds.has(f.id),
    )
    .map((framework) => ({
      organizationId,
      frameworkId: framework.id,
      currentVersionId: latestVersionByFrameworkId.get(framework.id) ?? null,
    }));

  if (instancesToCreate.length > 0) {
    await tx.frameworkInstance.createMany({ data: instancesToCreate });
  }

  const allOrgInstances = await tx.frameworkInstance.findMany({
    where: {
      organizationId,
      frameworkId: { in: targetFrameworkEditorIds },
    },
    select: { id: true, frameworkId: true },
  });
  const editorToInstanceMap = new Map(
    allOrgInstances.map((inst) => [inst.frameworkId, inst.id]),
  );

  // Upsert control instances
  const existingControls = await tx.control.findMany({
    where: {
      organizationId,
      controlTemplateId: { in: controlTemplateIds },
    },
    select: { controlTemplateId: true },
  });
  const existingControlTemplateIds = new Set(
    existingControls
      .map((c) => c.controlTemplateId)
      .filter((id): id is string => id !== null),
  );

  const controlsToCreate = controlTemplates.filter(
    (t) => !existingControlTemplateIds.has(t.id),
  );
  if (controlsToCreate.length > 0) {
    await tx.control.createMany({
      data: controlsToCreate.map((ct) => ({
        name: ct.name,
        description: ct.description,
        organizationId,
        controlTemplateId: ct.id,
      })),
    });
  }

  // Upsert policy instances
  const createdPolicyIds: string[] = [];
  const existingPolicies = await tx.policy.findMany({
    where: {
      organizationId,
      policyTemplateId: { in: policyTemplateIds },
    },
    select: { policyTemplateId: true },
  });
  const existingPolicyTemplateIds = new Set(
    existingPolicies
      .map((p) => p.policyTemplateId)
      .filter((id): id is string => id !== null),
  );

  const policiesToCreate = policyTemplates.filter(
    (t) => !existingPolicyTemplateIds.has(t.id),
  );
  if (policiesToCreate.length > 0) {
    await tx.policy.createMany({
      data: policiesToCreate.map((pt) => ({
        name: pt.name,
        description: pt.description,
        department: pt.department,
        frequency: pt.frequency,
        content: sanitizeJsonContent(pt.content),
        organizationId,
        policyTemplateId: pt.id,
      })),
    });

    const newPolicies = await tx.policy.findMany({
      where: {
        organizationId,
        policyTemplateId: { in: policiesToCreate.map((t) => t.id) },
      },
      select: { id: true, policyTemplateId: true, content: true },
    });

    if (newPolicies.length > 0) {
      createdPolicyIds.push(...newPolicies.map((p) => p.id));
      await tx.policyVersion.createMany({
        data: newPolicies.map((p) => ({
          policyId: p.id,
          version: 1,
          content: sanitizeJsonContent(p.content),
          changelog: 'Initial version from template',
        })),
      });

      const createdVersions = await tx.policyVersion.findMany({
        where: {
          policyId: { in: newPolicies.map((p) => p.id) },
          version: 1,
        },
        select: { id: true, policyId: true },
      });

      for (const version of createdVersions) {
        await tx.policy.update({
          where: { id: version.policyId },
          data: { currentVersionId: version.id },
        });
      }
    }
  }

  // Upsert task instances
  const existingTasks = await tx.task.findMany({
    where: {
      organizationId,
      taskTemplateId: { in: taskTemplateIds },
    },
    select: { taskTemplateId: true },
  });
  const existingTaskTemplateIds = new Set(
    existingTasks
      .map((t) => t.taskTemplateId)
      .filter((id): id is string => id !== null),
  );

  const tasksToCreate = taskTemplates.filter(
    (t) => !existingTaskTemplateIds.has(t.id),
  );
  if (tasksToCreate.length > 0) {
    await tx.task.createMany({
      data: tasksToCreate.map((tt) => ({
        title: tt.name,
        description: tt.description,
        automationStatus: tt.automationStatus,
        frequency: tt.frequency,
        department: tt.department,
        organizationId,
        taskTemplateId: tt.id,
      })),
    });
  }

  // Establish relations
  const allControls = await tx.control.findMany({
    where: {
      organizationId,
      controlTemplateId: { in: controlTemplateIds },
    },
    select: { id: true, controlTemplateId: true },
  });
  const allPolicies = await tx.policy.findMany({
    where: {
      organizationId,
      policyTemplateId: { in: policyTemplateIds },
    },
    select: { id: true, policyTemplateId: true },
  });
  const allTasks = await tx.task.findMany({
    where: {
      organizationId,
      taskTemplateId: { in: taskTemplateIds },
    },
    select: { id: true, taskTemplateId: true },
  });

  const controlMap = new Map(
    allControls
      .filter((c) => c.controlTemplateId != null)
      .map((c) => [c.controlTemplateId!, c.id]),
  );
  const policyMap = new Map(
    allPolicies
      .filter((p) => p.policyTemplateId != null)
      .map((p) => [p.policyTemplateId!, p.id]),
  );
  const taskMap = new Map(
    allTasks
      .filter((t) => t.taskTemplateId != null)
      .map((t) => [t.taskTemplateId!, t.id]),
  );

  const requirementMapEntries: Prisma.RequirementMapCreateManyInput[] = [];
  const controlDocumentTypeEntries: Prisma.ControlDocumentTypeCreateManyInput[] = [];
  const frameworkControlPolicyEntries: Prisma.FrameworkControlPolicyLinkCreateManyInput[] = [];
  const frameworkControlTaskEntries: Prisma.FrameworkControlTaskLinkCreateManyInput[] = [];
  const frameworkControlDocumentTypeEntries: Prisma.FrameworkControlDocumentTypeLinkCreateManyInput[] = [];
  const frameworkControlFamilyEntries: Prisma.FrameworkControlFamilyCreateManyInput[] = [];
  const controlTemplateById = new Map(controlTemplates.map((c) => [c.id, c]));

  for (const relation of groupedRelations) {
    const controlId = controlMap.get(relation.controlTemplateId);
    if (!controlId) continue;
    const frameworkInstanceId = editorToInstanceMap.get(relation.frameworkId);
    if (!frameworkInstanceId) continue;

    const updateData: Prisma.ControlUpdateInput = {};
    let needsUpdate = false;

    for (const reqTemplateId of relation.requirementTemplateIds) {
      requirementMapEntries.push({
        controlId,
        requirementId: reqTemplateId,
        frameworkInstanceId,
      });
    }

    const policiesToConnect = relation.policyTemplateIds
      .map((ptId) => policyMap.get(ptId))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    if (policiesToConnect.length > 0) {
      updateData.policies = { connect: policiesToConnect };
      needsUpdate = true;
    }
    for (const policy of policiesToConnect) {
      frameworkControlPolicyEntries.push({
        frameworkInstanceId,
        controlId,
        policyId: policy.id,
      });
    }

    const tasksToConnect = relation.taskTemplateIds
      .map((ttId) => taskMap.get(ttId))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    if (tasksToConnect.length > 0) {
      updateData.tasks = { connect: tasksToConnect };
      needsUpdate = true;
    }
    for (const task of tasksToConnect) {
      frameworkControlTaskEntries.push({
        frameworkInstanceId,
        controlId,
        taskId: task.id,
      });
    }

    if (needsUpdate) {
      await tx.control.update({
        where: { id: controlId },
        data: updateData,
      });
    }

    // ControlDocumentType: explicit junction rows. Drive from manifest/live
    // documentTypes so the new org starts with the same evidence form types
    // the published version specified. Skip duplicates against existing rows
    // via the unique constraint at create time.
    const documentTypes = relation.documentTypes.length > 0
      ? relation.documentTypes
      : (controlTemplateById.get(relation.controlTemplateId)?.documentTypes ?? []);
    for (const formType of documentTypes) {
      controlDocumentTypeEntries.push({ controlId, formType });
      frameworkControlDocumentTypeEntries.push({
        frameworkInstanceId,
        controlId,
        formType,
      });
    }

    // FrameworkControlFamily: per-instance family grouping from the template.
    const template = controlTemplateById.get(relation.controlTemplateId);
    if (template?.controlFamily) {
      frameworkControlFamilyEntries.push({
        frameworkInstanceId,
        controlId,
        controlFamily: template.controlFamily,
      });
    }
  }

  if (requirementMapEntries.length > 0) {
    await tx.requirementMap.createMany({
      data: requirementMapEntries,
      skipDuplicates: true,
    });
  }

  if (controlDocumentTypeEntries.length > 0) {
    await tx.controlDocumentType.createMany({
      data: controlDocumentTypeEntries,
      skipDuplicates: true,
    });
  }

  if (frameworkControlPolicyEntries.length > 0) {
    await tx.frameworkControlPolicyLink.createMany({
      data: frameworkControlPolicyEntries,
      skipDuplicates: true,
    });
  }

  if (frameworkControlTaskEntries.length > 0) {
    await tx.frameworkControlTaskLink.createMany({
      data: frameworkControlTaskEntries,
      skipDuplicates: true,
    });
  }

  if (frameworkControlDocumentTypeEntries.length > 0) {
    await tx.frameworkControlDocumentTypeLink.createMany({
      data: frameworkControlDocumentTypeEntries,
      skipDuplicates: true,
    });
  }

  if (frameworkControlFamilyEntries.length > 0) {
    await tx.frameworkControlFamily.createMany({
      data: frameworkControlFamilyEntries,
      skipDuplicates: true,
    });
  }

  return {
    processedFrameworks: frameworkEditorFrameworks,
    controlTemplates,
    policyTemplates,
    taskTemplates,
    createdPolicyIds,
  };
}
