import { Prisma } from '@trycompai/db';

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
  // Get all template entities based on input frameworks
  const requirementIds = frameworkEditorFrameworks.flatMap((framework) =>
    framework.requirements.map((req) => req.id),
  );

  const controlTemplates = await tx.frameworkEditorControlTemplate.findMany({
    where: {
      requirements: { some: { id: { in: requirementIds } } },
    },
  });
  const controlTemplateIds = controlTemplates.map((c) => c.id);

  const policyTemplates = await tx.frameworkEditorPolicyTemplate.findMany({
    where: {
      controlTemplates: { some: { id: { in: controlTemplateIds } } },
    },
  });
  const policyTemplateIds = policyTemplates.map((p) => p.id);

  const taskTemplates = await tx.frameworkEditorTaskTemplate.findMany({
    where: {
      controlTemplates: { some: { id: { in: controlTemplateIds } } },
    },
  });
  const taskTemplateIds = taskTemplates.map((t) => t.id);

  // Get all template relations
  const controlRelations = await tx.frameworkEditorControlTemplate.findMany({
    where: { id: { in: controlTemplateIds } },
    select: {
      id: true,
      requirements: { where: { id: { in: requirementIds } } },
      policyTemplates: { where: { id: { in: policyTemplateIds } } },
      taskTemplates: { where: { id: { in: taskTemplateIds } } },
    },
  });

  const groupedRelations = controlRelations.map((ct) => ({
    controlTemplateId: ct.id,
    requirementTemplateIds: ct.requirements.map((r) => r.id),
    policyTemplateIds: ct.policyTemplates.map((p) => p.id),
    taskTemplateIds: ct.taskTemplates.map((t) => t.id),
  }));

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
        content:
          pt.content as Prisma.PolicyCreateInput['content'],
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
      await tx.policyVersion.createMany({
        data: newPolicies.map((p) => ({
          policyId: p.id,
          version: 1,
          content: p.content as Prisma.InputJsonValue[],
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

  for (const relation of groupedRelations) {
    const controlId = controlMap.get(relation.controlTemplateId);
    if (!controlId) continue;

    const updateData: Prisma.ControlUpdateInput = {};
    let needsUpdate = false;

    // Process requirements for RequirementMap
    for (const reqTemplateId of relation.requirementTemplateIds) {
      let frameworkEditorId: string | undefined;
      for (const fw of frameworkEditorFrameworks) {
        if (fw.requirements.some((r) => r.id === reqTemplateId)) {
          frameworkEditorId = fw.id;
          break;
        }
      }
      const frameworkInstanceId = frameworkEditorId
        ? editorToInstanceMap.get(frameworkEditorId)
        : undefined;

      if (frameworkInstanceId) {
        requirementMapEntries.push({
          controlId,
          requirementId: reqTemplateId,
          frameworkInstanceId,
        });
      }
    }

    // Connect policies
    const policiesToConnect = relation.policyTemplateIds
      .map((ptId) => policyMap.get(ptId))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    if (policiesToConnect.length > 0) {
      updateData.policies = { connect: policiesToConnect };
      needsUpdate = true;
    }

    // Connect tasks
    const tasksToConnect = relation.taskTemplateIds
      .map((ttId) => taskMap.get(ttId))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    if (tasksToConnect.length > 0) {
      updateData.tasks = { connect: tasksToConnect };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await tx.control.update({
        where: { id: controlId },
        data: updateData,
      });
    }
  }

  // Create RequirementMap entries
  if (requirementMapEntries.length > 0) {
    await tx.requirementMap.createMany({
      data: requirementMapEntries,
      skipDuplicates: true,
    });
  }

  return {
    processedFrameworks: frameworkEditorFrameworks,
    controlTemplates,
    policyTemplates,
    taskTemplates,
  };
}
