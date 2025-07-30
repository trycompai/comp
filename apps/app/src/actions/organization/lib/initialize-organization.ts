import { db, Prisma } from '@db';

// Define a type for FrameworkEditorFramework with requirements included
// This assumes FrameworkEditorFramework and FrameworkEditorRequirement are valid Prisma types.
// Adjust if your Prisma client exposes these differently (e.g., via Prisma.FrameworkEditorFrameworkGetPayload).
type FrameworkEditorFrameworkWithRequirements = Prisma.FrameworkEditorFrameworkGetPayload<{
  include: { requirements: true };
}>;

export type InitializeOrganizationInput = {
  frameworkIds: string[];
  organizationId: string;
};

// Renamed for clarity and broader applicability
export type UpsertOrgFrameworkStructureCoreInput = {
  organizationId: string;
  targetFrameworkEditorIds: string[];
  frameworkEditorFrameworks: FrameworkEditorFrameworkWithRequirements[];
  tx: Prisma.TransactionClient;
};

// Renamed for clarity and broader applicability
export const _upsertOrgFrameworkStructureCore = async ({
  organizationId,
  targetFrameworkEditorIds,
  frameworkEditorFrameworks,
  tx,
}: UpsertOrgFrameworkStructureCoreInput) => {
  /**
    |--------------------------------------------------
    | Get All Template Entities Based on Input Frameworks
    |--------------------------------------------------
    | Requirements from frameworkEditorFrameworks
    | ControlTemplates based on Requirements
    | PolicyTemplates based on ControlTemplates
    | TaskTemplates based on ControlTemplates
    |--------------------------------------------------
    */
  const requirementIds = frameworkEditorFrameworks.flatMap((framework) =>
    framework.requirements.map((req) => req.id),
  );

  const controlTemplates = await tx.frameworkEditorControlTemplate.findMany({
    where: {
      requirements: {
        some: {
          id: { in: requirementIds },
        },
      },
    },
  });
  const controlTemplateIds = controlTemplates.map((control) => control.id);

  const policyTemplates = await tx.frameworkEditorPolicyTemplate.findMany({
    where: {
      controlTemplates: {
        some: { id: { in: controlTemplateIds } },
      },
    },
  });
  const policyTemplateIds = policyTemplates.map((policy) => policy.id);

  const taskTemplates = await tx.frameworkEditorTaskTemplate.findMany({
    where: {
      controlTemplates: {
        some: { id: { in: controlTemplateIds } },
      },
    },
  });
  const taskTemplateIds = taskTemplates.map((task) => task.id);

  /**
    |--------------------------------------------------
    | Get All Template Relations
    |--------------------------------------------------
    | ControlTemplates <> Requirements
    | ControlTemplates <> PolicyTemplates
    | ControlTemplates <> TaskTemplates
    |--------------------------------------------------
    */
  const controlRelations = await tx.frameworkEditorControlTemplate.findMany({
    where: {
      id: { in: controlTemplateIds },
    },
    select: {
      id: true,
      requirements: { where: { id: { in: requirementIds } } },
      policyTemplates: { where: { id: { in: policyTemplateIds } } },
      taskTemplates: { where: { id: { in: taskTemplateIds } } },
    },
  });

  const groupedControlTemplateRelations = controlRelations.map((controlTemplate) => ({
    controlTemplateId: controlTemplate.id,
    requirementTemplateIds: controlTemplate.requirements.map((req) => req.id),
    policyTemplateIds: controlTemplate.policyTemplates.map((policy) => policy.id),
    taskTemplateIds: controlTemplate.taskTemplates.map((task) => task.id),
  }));

  /**
    |--------------------------------------------------
    | Upsert Framework Instances
    |--------------------------------------------------
    | Create FrameworkInstances if they don't already exist for the organization
    | and targetFrameworkEditorIds. Then, fetch all relevant instances (new + existing).
    |--------------------------------------------------
    */
  const existingFrameworkInstances = await tx.frameworkInstance.findMany({
    where: {
      organizationId: organizationId,
      frameworkId: { in: targetFrameworkEditorIds },
    },
    select: { frameworkId: true },
  });
  const existingFrameworkInstanceFrameworkIds = new Set(
    existingFrameworkInstances.map((fi) => fi.frameworkId),
  );

  const frameworkInstancesToCreateData = frameworkEditorFrameworks
    .filter(
      (f) =>
        targetFrameworkEditorIds.includes(f.id) && !existingFrameworkInstanceFrameworkIds.has(f.id),
    )
    .map((framework) => ({
      organizationId: organizationId,
      frameworkId: framework.id,
    }));

  if (frameworkInstancesToCreateData.length > 0) {
    await tx.frameworkInstance.createMany({
      data: frameworkInstancesToCreateData,
    });
  }

  const allOrgFrameworkInstances = await tx.frameworkInstance.findMany({
    where: {
      organizationId: organizationId,
      frameworkId: { in: targetFrameworkEditorIds },
    },
    select: { id: true, frameworkId: true },
  });
  const editorFrameworkIdToInstanceIdMap = new Map(
    allOrgFrameworkInstances.map((inst) => [inst.frameworkId, inst.id]),
  );

  /**
    |--------------------------------------------------
    | Upsert Control Instances
    |--------------------------------------------------
    */
  const existingControlsQuery = await tx.control.findMany({
    where: {
      organizationId: organizationId,
      controlTemplateId: { in: controlTemplateIds },
    },
    select: { controlTemplateId: true },
  });
  const existingControlTemplateIdsSet = new Set(
    existingControlsQuery.map((c) => c.controlTemplateId).filter((id) => id !== null) as string[],
  );

  const controlTemplatesForCreation = controlTemplates.filter(
    (template) => !existingControlTemplateIdsSet.has(template.id),
  );

  if (controlTemplatesForCreation.length > 0) {
    await tx.control.createMany({
      data: controlTemplatesForCreation.map((controlTemplate) => ({
        name: controlTemplate.name,
        description: controlTemplate.description,
        organizationId: organizationId,
        controlTemplateId: controlTemplate.id,
      })),
    });
  }

  /**
    |--------------------------------------------------
    | Upsert Policy Instances
    |--------------------------------------------------
    */
  const existingPoliciesQuery = await tx.policy.findMany({
    where: {
      organizationId: organizationId,
      policyTemplateId: { in: policyTemplateIds },
    },
    select: { policyTemplateId: true },
  });
  const existingPolicyTemplateIdsSet = new Set(
    existingPoliciesQuery.map((p) => p.policyTemplateId).filter((id) => id !== null) as string[],
  );

  const policyTemplatesForCreation = policyTemplates.filter(
    (template) => !existingPolicyTemplateIdsSet.has(template.id),
  );

  if (policyTemplatesForCreation.length > 0) {
    await tx.policy.createMany({
      data: policyTemplatesForCreation.map((policyTemplate) => ({
        name: policyTemplate.name,
        description: policyTemplate.description,
        department: policyTemplate.department,
        frequency: policyTemplate.frequency,
        content: policyTemplate.content as Prisma.PolicyCreateInput['content'],
        organizationId: organizationId,
        policyTemplateId: policyTemplate.id,
      })),
    });
  }

  /**
    |--------------------------------------------------
    | Upsert Task Instances
    |--------------------------------------------------
    */
  const existingTasksQuery = await tx.task.findMany({
    where: {
      organizationId: organizationId,
      taskTemplateId: { in: taskTemplateIds },
    },
    select: { taskTemplateId: true },
  });
  const existingTaskTemplateIdsSet = new Set(
    existingTasksQuery.map((t) => t.taskTemplateId).filter((id) => id !== null) as string[],
  );

  const taskTemplatesForCreation = taskTemplates.filter(
    (template) => !existingTaskTemplateIdsSet.has(template.id),
  );
  if (taskTemplatesForCreation.length > 0) {
    await tx.task.createMany({
      data: taskTemplatesForCreation.map((taskTemplate) => ({
        title: taskTemplate.name,
        description: taskTemplate.description,
        organizationId: organizationId,
        taskTemplateId: taskTemplate.id,
      })),
    });
  }

  /**
    |--------------------------------------------------
    | Establish Relations
    |--------------------------------------------------
    | Fetch all relevant instances (Controls, Policies, Tasks) for mapping.
    | Create RequirementMap entries.
    | Connect Policies and Tasks to their respective Control instances.
    |--------------------------------------------------
    */
  const allRelevantControls = await tx.control.findMany({
    where: {
      organizationId: organizationId,
      controlTemplateId: { in: controlTemplateIds },
    },
    select: { id: true, controlTemplateId: true },
  });
  const allRelevantPolicies = await tx.policy.findMany({
    where: {
      organizationId: organizationId,
      policyTemplateId: { in: policyTemplateIds },
    },
    select: { id: true, policyTemplateId: true },
  });
  const allRelevantTasks = await tx.task.findMany({
    where: {
      organizationId: organizationId,
      taskTemplateId: { in: taskTemplateIds },
    },
    select: { id: true, taskTemplateId: true },
  });

  const controlTemplateIdToInstanceIdMap = new Map(
    allRelevantControls
      .filter((c) => c.controlTemplateId != null)
      .map((c) => [c.controlTemplateId!, c.id]),
  );
  const policyTemplateIdToInstanceIdMap = new Map(
    allRelevantPolicies
      .filter((p) => p.policyTemplateId != null)
      .map((p) => [p.policyTemplateId!, p.id]),
  );
  const taskTemplateIdToInstanceIdMap = new Map(
    allRelevantTasks.filter((t) => t.taskTemplateId != null).map((t) => [t.taskTemplateId!, t.id]),
  );

  const requirementMapEntriesToCreate: Prisma.RequirementMapCreateManyInput[] = [];

  for (const controlTemplateRelation of groupedControlTemplateRelations) {
    const newControlId = controlTemplateIdToInstanceIdMap.get(
      controlTemplateRelation.controlTemplateId,
    );

    if (!newControlId) {
      console.warn(
        `UpsertOrgFrameworkStructureCore: Control instance not found for template ID ${controlTemplateRelation.controlTemplateId}. Skipping relation processing.`,
      );
      continue;
    }

    const updateData: Prisma.ControlUpdateInput = {};
    let needsUpdate = false;

    // --- Process Requirements for RequirementMap ---
    if (controlTemplateRelation.requirementTemplateIds.length > 0) {
      for (const reqTemplateId of controlTemplateRelation.requirementTemplateIds) {
        let frameworkEditorFrameworkIdForReq: string | undefined;
        for (const fw of frameworkEditorFrameworks) {
          if (fw.requirements.some((r) => r.id === reqTemplateId)) {
            frameworkEditorFrameworkIdForReq = fw.id;
            break;
          }
        }
        const frameworkInstanceId = frameworkEditorFrameworkIdForReq
          ? editorFrameworkIdToInstanceIdMap.get(frameworkEditorFrameworkIdForReq)
          : undefined;

        if (frameworkInstanceId) {
          requirementMapEntriesToCreate.push({
            controlId: newControlId,
            requirementId: reqTemplateId,
            frameworkInstanceId: frameworkInstanceId,
          });
        } else {
          console.warn(
            `UpsertOrgFrameworkStructureCore: Could not find FrameworkInstanceId for editor requirement ID ${reqTemplateId}. Cannot create RequirementMap for Control ${newControlId}.`,
          );
        }
      }
    }

    // --- Connect Policies ---
    if (controlTemplateRelation.policyTemplateIds.length > 0) {
      const policiesToConnect = [];
      for (const policyTemplateId of controlTemplateRelation.policyTemplateIds) {
        const newPolicyId = policyTemplateIdToInstanceIdMap.get(policyTemplateId);
        if (newPolicyId) {
          policiesToConnect.push({ id: newPolicyId });
        } else {
          console.warn(
            `UpsertOrgFrameworkStructureCore: Policy instance not found for template ID ${policyTemplateId}. Cannot connect to Control ${newControlId}.`,
          );
        }
      }
      if (policiesToConnect.length > 0) {
        updateData.policies = { connect: policiesToConnect };
        needsUpdate = true;
      }
    }

    // --- Connect Tasks ---
    if (controlTemplateRelation.taskTemplateIds.length > 0) {
      const tasksToConnect = [];
      for (const taskTemplateId of controlTemplateRelation.taskTemplateIds) {
        const newTaskId = taskTemplateIdToInstanceIdMap.get(taskTemplateId);
        if (newTaskId) {
          tasksToConnect.push({ id: newTaskId });
        } else {
          console.warn(
            `UpsertOrgFrameworkStructureCore: Task instance not found for template ID ${taskTemplateId}. Cannot connect to Control ${newControlId}.`,
          );
        }
      }
      if (tasksToConnect.length > 0) {
        updateData.tasks = { connect: tasksToConnect };
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await tx.control.update({
        where: { id: newControlId },
        data: updateData,
      });
    }
  }

  // --- Create RequirementMap entries ---
  if (requirementMapEntriesToCreate.length > 0) {
    await tx.requirementMap.createMany({
      data: requirementMapEntriesToCreate,
      skipDuplicates: true,
    });
  }

  return {
    processedFrameworks: frameworkEditorFrameworks,
    controlTemplates,
    policyTemplates,
    taskTemplates,
  };
};

export const initializeOrganization = async ({
  frameworkIds,
  organizationId,
}: InitializeOrganizationInput) => {
  const frameworksAndReqsToProcess = await db.frameworkEditorFramework.findMany({
    where: {
      id: { in: frameworkIds },
    },
    include: {
      requirements: true,
    },
  });

  if (frameworksAndReqsToProcess.length === 0 && frameworkIds.length > 0) {
    console.warn(
      `InitializeOrganization: No FrameworkEditorFrameworks found for IDs: ${frameworkIds.join(', ')}`,
    );
  }

  const result = await db.$transaction(async (tx) => {
    return _upsertOrgFrameworkStructureCore({
      organizationId,
      targetFrameworkEditorIds: frameworkIds,
      frameworkEditorFrameworks: frameworksAndReqsToProcess,
      tx,
    });
  });
  return result;
};
