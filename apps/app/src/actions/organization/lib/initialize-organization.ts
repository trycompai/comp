import { db } from "@comp/db";
import { Prisma } from "@comp/db/types";


export type InitializeOrganizationInput = {
    frameworkIds: string[]; 
    organizationId: string;
}

export const initializeOrganization = async ({frameworkIds, organizationId}: InitializeOrganizationInput) => {

    const result = await db.$transaction(
        async (tx) => {

            /**
            |--------------------------------------------------
            | Get All Entities
            |--------------------------------------------------
            | Frameworks
            | Requirements
            | Controls
            | Policies
            | Tasks
            |--------------------------------------------------
            */

        // Get all Frameworks and Requirements
        const frameworksAndRequirements = await tx.frameworkEditorFramework.findMany({
            where: {
                id: { in: frameworkIds },
            },
            include: {
                requirements: true
            },
        });
        const requirementIds = frameworksAndRequirements.flatMap(
            (framework) => framework.requirements.map((req) => req.id)
        );

        // Get all Controls Mapped to These Requirements
        const controlTemplates = await tx.frameworkEditorControlTemplate.findMany({
            where: {
                requirements: {
                    some: {
                        id: { in: requirementIds }
                    }
                }
            },
        });
        const controlTemplateIds = controlTemplates.map(control => control.id);

        // Get all policies mapped to these controls
        const policyTemplates = await tx.frameworkEditorPolicyTemplate.findMany({
            where: {
                controlTemplates: {
                    some: { id: { in: controlTemplateIds } }
                }
            },
        });
        const policyTemplateIds = policyTemplates.map(policy => policy.id);


        // Get all tasks mapped to these controls
        const taskTemplates = await tx.frameworkEditorTaskTemplate.findMany({
            where: {
                controlTemplates: {
                    some: { id: { in: controlTemplateIds } }
                }
            },
        });
        const taskTemplateIds = taskTemplates.map(task => task.id);

        /**
        |--------------------------------------------------
        | Get All Relations
        |--------------------------------------------------
        | Controls <> Requirements
        | Controls <> Policies
        | Controls <> Tasks
        |--------------------------------------------------
        */

        // Get all control templates mapped to these policies
        const controlRelations = await tx.frameworkEditorControlTemplate.findMany({
            where: {
                id: { in: controlTemplateIds }
            },
            select: {
                id: true,
                requirements: {
                    where: {
                        id: { in: requirementIds }
                    }
                },
                policyTemplates: {
                    where: {
                        id: { in: policyTemplateIds }
                    }
                },
                taskTemplates: {
                    where: {
                        id: { in: taskTemplateIds }
                    }
                }
            }
        });


        const flattenedControlRelations = controlRelations.flatMap(control => [
            ...control.requirements.map(req => ({
                controlId: control.id,
                requirementId: req.id
            })),
            ...control.policyTemplates.map(policy => ({
                controlId: control.id,
                policyId: policy.id
            })),
            ...control.taskTemplates.map(task => ({
                controlId: control.id,
                taskId: task.id
            }))
        ]);


        /**
        |--------------------------------------------------
        | Clone and Insert All Entities
        |--------------------------------------------------
        | Framework
        | Control
        | Policy
        | Task
        |--------------------------------------------------
        */

        /**
        |--------------------------------------------------
        | Framework
        |--------------------------------------------------
        */

        // Create new framework instances
        await tx.frameworkInstance.createMany({
            data: frameworksAndRequirements.map(framework => ({
                organizationId: organizationId,
                frameworkId: framework.id
            }))
        });


        /**
        |--------------------------------------------------
        | Controls
        |--------------------------------------------------
        */

        // Create new control instances
        await tx.control.createMany({
            data: controlTemplates.map(controlTemplate => ({
                name: controlTemplate.name,
                description: controlTemplate.description,
                organizationId: organizationId
            }))
        });

        /**
        |--------------------------------------------------
        | Policies
        |--------------------------------------------------
        */

        await tx.policy.createMany({
            data: policyTemplates.map(policyTemplate => ({
                name: policyTemplate.name,
                description: policyTemplate.description,
                department: policyTemplate.department,
                frequency: policyTemplate.frequency,
                // We're assuming the content is already in the correct format since it's coming from the template.
                content: policyTemplate.content as Prisma.PolicyCreateInput['content'],
                organizationId: organizationId
            }))
        });

        /**
        |--------------------------------------------------
        | Tasks
        |--------------------------------------------------
        */

        await tx.task.createMany({
            data: taskTemplates.map(taskTemplate => ({
                title: taskTemplate.name,
                description: taskTemplate.description,
                // This needs to be revisited so that we can map it to the correct controls (many to many)
                entityId: taskTemplate.id,
                entityType: "control",
                organizationId: organizationId
            }))
        });

        // TODO;
        // Add Support for Template Id on all Primitives;
        //// Enable Relational Support for ease of querying.
        // Add Support for Many to Many Task Mapping;
        //// Write SQL to make sure we create relations between existing controls, policies, etc..
        // Enable Relations between static Frameworks/REquirements, and instances and change cascade to PROHIBIT Accidental deeltions.  
        // We will need to do some repairing on production to fix ids that dont conform to the new schema.


        /**
        |--------------------------------------------------
        | Clone and Insert All Relations
        |--------------------------------------------------
        | Framework
        | Control
        | Policy
        | Task
        |--------------------------------------------------
        */

        


        console.log({
            frameworksAndRequirements,
            controlTemplates,
            policyTemplates,
            taskTemplates
        })

        console.log(JSON.stringify({
            flattenedControlRelations
        }, null, 2))

        return {
            frameworksAndRequirements,
            controlTemplates,
            policyTemplates,
            taskTemplates
        }

    });
    return result;
}









// const result = await db.$transaction(
//     async (tx) => {
//         // REVISIT: Consider if more granular error handling/logging is needed within the transaction

//         start = performance.now();
//         // Grab All Entities





//         // OLD 
//         const relevantControls = await getRelevantControls(frameworks);
//         const getRelevantControlsTime =
//             (performance.now() - start) / 1000;


//         /**
//         |--------------------------------------------------
//         | We're not actually inserting controls right now
//         | Should probably just rethink this whole process and reimplement from scratch
//         |--------------------------------------------------
//         */

//         start = performance.now();
//         // Pass the transaction client `tx` to the helper
//         const organizationFrameworks = await Promise.all(
//             frameworks.map(
//                 (frameworkId) =>
//                     createFrameworkInstance(
//                         organizationId,
//                         frameworkId,
//                         tx,
//                     ), // Pass tx
//             ),
//         );
//         const createFrameworkInstancesTime =
//             (performance.now() - start) / 1000;

//         // Fetch DB controls needed for Task creation
//         const dbControlsList = await tx.control.findMany({
//             where: {
//                 organizationId,
//                 name: { in: relevantControls.map((c) => c.name) },
//             },
//             select: { id: true, name: true },
//         });
//         const dbControlsMap = new Map<string, { id: string }>();
//         for (const control of dbControlsList) {
//             dbControlsMap.set(control.name, control);
//         }

//         // Run policy and task creation in parallel
//         start = performance.now();
//         // const [policiesForFrameworks, tasksCreationResult] =
//         // 	await Promise.all([
//         // 		createOrganizationPolicies(
//         // 			organizationId,
//         // 			relevantControls,
//         // 			userId,
//         // 			tx,
//         // 		), // Pass tx
//         // 		createOrganizationTasks(
//         // 			organizationId,
//         // 			relevantControls,
//         // 			dbControlsMap, // Pass the map
//         // 			userId,
//         // 			tx,
//         // 		),
//         // 	]);
//         const createPoliciesAndTasksParallelTime =
//             (performance.now() - start) / 1000;

//         start = performance.now();
//         // Pass the transaction client `tx` to the helper
//         // await createControlArtifacts(
//         // 	organizationId,
//         // 	organizationFrameworks.map((framework) => framework.id),
//         // 	relevantControls,
//         // 	policiesForFrameworks,
//         // 	tx, // Pass tx
//         // );
//         const createControlArtifactsTime =
//             (performance.now() - start) / 1000;

//         // Return timings calculated inside the transaction scope
//         return {
//             getRelevantControlsTime,
//             createFrameworkInstancesTime,
//             createPoliciesAndTasksParallelTime,
//             createControlArtifactsTime,
//             organizationFrameworks, // Need this for the final return value potentially
//         };
//     },
//     {
//         maxWait: 15000,
//         timeout: 40000,
//     },
// );