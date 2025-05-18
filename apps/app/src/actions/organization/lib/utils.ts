import type { TemplateControl, TemplateTask, TemplatePolicy } from "@comp/data";
import { controls, tasks, frameworks, policies } from "@comp/data";
import { db } from "@comp/db";
import {
	type PolicyStatus,
	TaskStatus,
	TaskFrequency,
	Departments,
	ArtifactType,
} from "@prisma/client";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";

/**
 * A type-safe wrapper for accessing policy templates by ID
 *
 * @param id - The ID of the policy to retrieve
 * @returns The policy template or undefined if not found
 */
export function getPolicyById(id: string): TemplatePolicy | undefined {
	// Use a type-safe approach to check if the key exists in the policies object
	return Object.entries(policies).find(([key]) => key === id)?.[1];
}

/**
 * Identifies which controls are relevant to the selected frameworks.
 *
 * This function filters the control templates from the data package to find
 * only those that map to requirements from the selected frameworks. This ensures
 * we only create controls that are actually needed for the organization's
 * compliance program.
 *
 * @param frameworkIds - Array of framework IDs selected by the organization
 * @returns Array of control templates relevant to the selected frameworks
 */
export function getRelevantControls(
	frameworkIds: string[],
): TemplateControl[] {
	return controls.filter((control) =>
		control.mappedRequirements.some((req) =>
			frameworkIds.includes(req.frameworkId),
		),
	);
}

/**
 * Creates framework instances for the organization.
 *
 * This function:
 * 1. Validates the organization and framework exist
 * 2. Creates a framework instance record linking the organization to the framework
 * 3. Creates control records for all controls required by the framework
 *
 * Framework instances represent which compliance frameworks an organization is
 * implementing, and what their status is with those frameworks.
 *
 * @param organizationId - ID of the organization
 * @param frameworkId - ID of the framework to create an instance for
 * @returns The created framework instance record
 */
export async function createFrameworkInstance(
	organizationId: string,
	frameworkId: string,
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;
	// First verify the organization exists
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
	});

	if (!organization) {
		console.error("Organization not found when creating framework", {
			organizationId,
			frameworkId,
		});
		throw new Error(`Organization with ID ${organizationId} not found`);
	}

	// Verify the framework exists
	// @ts-expect-error
	const framework = frameworks[frameworkId]; 

	if (!framework) {
		console.error(
			"Framework not found when creating organization framework",
			{
				organizationId,
				frameworkId,
			},
		);
		throw new Error(`Framework with ID ${frameworkId} not found`);
	}

	// Check if a framework instance already exists
	const existingFrameworkInstance = await prisma.frameworkInstance.findUnique(
		{
			where: {
				organizationId_frameworkId: {
					organizationId,
					frameworkId,
				},
			},
		},
	);

	// Create or update the framework instance
	const frameworkInstance = existingFrameworkInstance
		? await prisma.frameworkInstance.update({
				where: {
					id: existingFrameworkInstance.id,
				},
				data: {
					organizationId,
					frameworkId,
				},
			})
		: await prisma.frameworkInstance.create({
				data: {
					organizationId,
					frameworkId,
				},
			});

	console.info("Created/updated organization framework", {
		organizationId,
		frameworkId,
		frameworkInstanceId: frameworkInstance.id,
	});

	// Find all controls that apply to this specific framework
	const frameworkControls = controls.filter((control) =>
		control.mappedRequirements.some(
			(req) => req.frameworkId === frameworkId,
		),
	);

	console.log("frameworkControls", frameworkControls);

	// Prepare data for batch control creation
	const controlsToCreate = frameworkControls.map((control) => ({
		organizationId,
		name: control.name,
		description: control.description,
		// We connect frameworkInstances later or handle differently if createMany doesn't support relation connection easily
	}));

	console.log("controlsToCreate", controlsToCreate);

	// Batch create controls if there are any to create
	if (controlsToCreate.length > 0) {
		await prisma.control.createMany({
			data: controlsToCreate,
			skipDuplicates: true, // Assuming we want to skip if a control with the same unique constraint exists
		});

		// Fetch the controls we just created or found (based on name and orgId)
		// to get their IDs and connect them to the framework instance
		const createdOrFoundDbControls = await prisma.control.findMany({
			where: {
				organizationId,
				name: {
					in: frameworkControls.map((c: TemplateControl) => c.name),
				},
			},
			select: { id: true, name: true }, // Select only necessary fields
		});

		console.log("createdOrFoundDbControls", createdOrFoundDbControls);

		// Connect the controls to the framework instance
		if (createdOrFoundDbControls.length > 0) {
			await prisma.frameworkInstance.update({
				where: { id: frameworkInstance.id },
				data: {
					controls: {
						connect: createdOrFoundDbControls.map((c) => ({
							id: c.id,
						})),
					},
				},
			});
		}

		console.info(
			`Batch created/found ${createdOrFoundDbControls.length} controls for framework ${frameworkId}`,
		);

		// Create requirement maps for the controls
		// Pass the fetched controls with IDs to createRequirementMaps
		await createRequirementMaps(
			{ id: frameworkInstance.id, frameworkId },
			createdOrFoundDbControls, // Pass controls with IDs
			frameworkControls, // Pass original templates for mapping logic
			txClient, // Pass the transaction client down
		);
	} else {
		console.info(`No new controls to create for framework ${frameworkId}`);
	}

	return frameworkInstance;
}

/**
 * Creates requirement map entries linking controls to their requirements.
 *
 * This function:
 * 1. Takes a framework instance and its controls
 * 2. Creates RequirementMap entries linking controls to their requirements
 * 3. Ensures proper tracking of compliance requirements
 *
 * RequirementMaps represent which specific requirements (e.g., SOC2 CC1.1)
 * are satisfied by each control in the organization's compliance program.
 *
 * @param frameworkInstance - The framework instance record
 * @param controls - Array of created control records (must include id and name)
 * @param templateControls - Array of control templates with requirement mappings
 * @returns The number of requirement maps created
 */
export async function createRequirementMaps(
	frameworkInstance: { id: string; frameworkId: string },
	controls: { id: string; name: string }[],
	templateControls: TemplateControl[],
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	console.info("Creating requirement maps", {
		frameworkInstanceId: frameworkInstance.id,
		controlCount: controls.length,
	});

	// Create a map for efficient control lookup
	const controlMap = new Map(
		controls.map((control) => [control.name, control]),
	);

	// Prepare data for batch requirement map creation
	const requirementMapsToCreate: {
		controlId: string;
		frameworkInstanceId: string;
		requirementId: string;
	}[] = [];

	// For each template control
	for (const templateControl of templateControls) {
		// Find the corresponding created control
		const control = controlMap.get(templateControl.name);
		if (!control) {
			console.warn(
				`Control not found for template: ${templateControl.name}`,
			);
			continue;
		}

		// Get requirements for this framework
		const frameworkRequirements = templateControl.mappedRequirements.filter(
			(req) => req.frameworkId === frameworkInstance.frameworkId,
		);

		// Create requirement maps
		for (const requirement of frameworkRequirements) {
			// Prepare data instead of creating immediately
			requirementMapsToCreate.push({
				controlId: control.id,
				frameworkInstanceId: frameworkInstance.id,
				requirementId: requirement.requirementId,
			});
		}
	}

	// Batch create requirement maps if there are any
	let requirementMapsCreatedCount = 0;
	if (requirementMapsToCreate.length > 0) {
		try {
			const result = await prisma.requirementMap.createMany({
				data: requirementMapsToCreate,
				skipDuplicates: true, // Skip if the mapping already exists
			});
			requirementMapsCreatedCount = result.count;
			console.info(
				`Batch created ${requirementMapsCreatedCount} requirement maps`,
			);
		} catch (error) {
			console.error(
				`Error batch creating requirement maps for framework ${frameworkInstance.frameworkId}`,
				{ error },
			);

			throw new Error("Failed to create requirement maps");
		}
	} else {
		console.info(
			`No new requirement maps to create for framework ${frameworkInstance.frameworkId}`,
		);
	}

	return requirementMapsCreatedCount;
}

/**
 * Creates policy records for the organization based on control requirements.
 *
 * This function:
 * 1. Identifies all policies required by the relevant controls
 * 2. Creates policy records using templates from the data package
 * 3. Records which policies were created for later artifact linking
 *
 * Policies are core documents that define how an organization implements
 * their compliance requirements. They're referenced by controls to demonstrate
 * compliance with specific requirements.
 *
 * @param organizationId - ID of the organization
 * @param relevantControls - Array of controls relevant to the organization
 * @param userId - ID of the user creating the organization (becomes policy owner)
 * @returns Map of template policy IDs to created policy records
 */
export async function createOrganizationPolicies(
	organizationId: string,
	relevantControls: TemplateControl[],
	userId: string,
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// 1. Gather Required Template IDs and map templateId -> template
	const requiredTemplatesMap = new Map<string, TemplatePolicy>();
	for (const control of relevantControls) {
		for (const artifact of control.mappedArtifacts) {
			if (
				artifact.type === "policy" &&
				!requiredTemplatesMap.has(artifact.policyId)
			) {
				const policyTemplate = getPolicyById(artifact.policyId);
				if (policyTemplate) {
					requiredTemplatesMap.set(artifact.policyId, policyTemplate);
				} else {
					console.warn(
						`Policy template not found: ${artifact.policyId}`,
					);
				}
			}
		}
	}

	const requiredTemplateIds = Array.from(requiredTemplatesMap.keys());

	if (requiredTemplateIds.length === 0) {
		console.info("No policies required for the selected controls.");
		return new Map<string, any>();
	}

	console.info("Required policy templates identified", {
		organizationId,
		count: requiredTemplateIds.length,
		templateIds: requiredTemplateIds,
	});

	// 2. Check Existing Records
	const existingDbPolicies = await prisma.policy.findMany({
		where: {
			organizationId,
			name: {
				in: requiredTemplateIds.map(
					(id) => requiredTemplatesMap.get(id)!.metadata.name,
				),
			},
		},
	});
	const existingPolicyNameMap = new Map(
		existingDbPolicies.map((p) => [p.name, p]),
	);
	const finalPoliciesMap = new Map<string, any>();

	// Populate map with existing policies, keyed by template ID
	for (const [templateId, template] of requiredTemplatesMap.entries()) {
		const existingPolicy = existingPolicyNameMap.get(
			template.metadata.name,
		);
		if (existingPolicy) {
			finalPoliciesMap.set(templateId, existingPolicy);
		}
	}

	// 3. Identify Missing Templates
	const missingTemplateIds = requiredTemplateIds.filter(
		(templateId) => !finalPoliciesMap.has(templateId),
	);

	if (missingTemplateIds.length === 0) {
		console.info("All required policies already exist.");
		return finalPoliciesMap; // Return map containing only existing policies
	}

	console.info("Policies to be created", {
		organizationId,
		count: missingTemplateIds.length,
		templateIds: missingTemplateIds,
	});

	// Prepare data for missing policies
	const memberRecord = await prisma.member.findFirst({
		where: { organizationId, userId },
		select: { id: true },
	});
	if (!memberRecord) {
		console.warn(
			`Member record not found for user: ${userId} in org ${organizationId}. Cannot assign policies.`,
		);
	}

	const policiesToCreateData: Prisma.PolicyCreateManyInput[] = [];
	for (const templateId of missingTemplateIds) {
		const policyTemplate = requiredTemplatesMap.get(templateId)!;
		policiesToCreateData.push({
			organizationId,
			name: policyTemplate.metadata.name,
			description: policyTemplate.metadata.description,
			status: "draft" as PolicyStatus,
			content: policyTemplate.content as InputJsonValue[],
			assigneeId: memberRecord?.id || null,
			frequency: policyTemplate.metadata.frequency,
			department: policyTemplate.metadata.department,
		});
	}

	// 4. Create Only Missing Records
	if (policiesToCreateData.length > 0) {
		try {
			await prisma.policy.createMany({
				data: policiesToCreateData,
				skipDuplicates: true, // Keep for safety, though logic should prevent duplicates
			});
			console.info(
				`Batch created ${policiesToCreateData.length} policies for org ${organizationId}`,
			);

			// Fetch the newly created policies to add them to the map
			const newlyCreatedDbPolicies = await prisma.policy.findMany({
				where: {
					organizationId,
					name: { in: policiesToCreateData.map((p) => p.name) },
				},
			});
			const newPolicyNameMap = new Map(
				newlyCreatedDbPolicies.map((p) => [p.name, p]),
			);

			// 5. Combine and Return Map (Add newly created policies)
			for (const templateId of missingTemplateIds) {
				const policyTemplate = requiredTemplatesMap.get(templateId)!;
				const newPolicy = newPolicyNameMap.get(
					policyTemplate.metadata.name,
				);
				if (newPolicy) {
					finalPoliciesMap.set(templateId, newPolicy);
				} else {
					console.warn(
						`Could not find newly created policy in DB for template: ${templateId} (Name: ${policyTemplate.metadata.name})`,
					);
				}
			}
		} catch (error) {
			console.error(
				`Error batch creating policies for org ${organizationId}`,
				{
					error,
				},
			);
			throw new Error("Failed to create organization policies");
		}
	}

	return finalPoliciesMap;
}

/**
 * Creates Task records for the organization based on control requirements for tasks.
 *
 * This function:
 * 1. Identifies all task requirements from the relevant controls
 * 2. Creates Task records using details from the task templates in @comp/data
 * 3. Records which tasks were created for the organization
 *
 * Tasks represent the activities required to demonstrate
 * compliance with controls.
 *
 * @param organizationId - ID of the organization
 * @param relevantControls - Array of controls relevant to the organization
 * @param dbControls - Map of control names to their DB records (including ID)
 * @param userId - ID of the user creating the organization (becomes task assignee)
 * @returns Object with the count of tasks created
 */
export async function createOrganizationTasks(
	organizationId: string,
	relevantControls: TemplateControl[],
	dbControls: Map<string, { id: string }>,
	userId: string,
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	const tasksToCreateData: Prisma.TaskCreateManyInput[] = [];
	const memberRecord = await prisma.member.findFirst({
		where: { organizationId, userId, isActive: true },
		select: { id: true },
	});
	if (!memberRecord) {
		console.warn(
			`Active member record not found for user: ${userId} in org ${organizationId}. Cannot assign tasks.`,
		);
	}

	let tasksCreatedCount = 0;

	for (const control of relevantControls) {
		const dbControl = dbControls.get(control.name);
		if (!dbControl) continue;

		for (const task of control.mappedTasks) {
			const taskTemplateId = task.taskId;
			// Directly access the template from the imported task data
			const taskTemplate = tasks[taskTemplateId as keyof typeof tasks] as
				| TemplateTask
				| undefined;

			if (!taskTemplate) {
				console.warn(
					`Task template not found in @comp/data for ID: ${taskTemplateId} (Control: ${control.name})`,
				);
				continue; // Skip if template doesn't exist
			}

			try {
				// Create one task per control that requires this type of task
				await prisma.task.create({
					data: {
						organizationId,
						title: taskTemplate.name, // Use template name
						description: taskTemplate.description, // Use template desc
						status: TaskStatus.todo,
						// entityId: dbControl.id, // Link to the Control ID
						// entityType: TaskEntityType.control,
						controls: { connect: { id: dbControl.id } },
						frequency: taskTemplate.frequency ?? TaskFrequency.quarterly, // Use template freq
						assigneeId: memberRecord?.id || null,
						department: taskTemplate.department ?? Departments.none, // Use template department
					},
				});
				tasksCreatedCount++;
			} catch (error) {
				console.error(
					`Error creating task for control ${control.name} with template ${taskTemplateId}`,
					{ error },
				);
				// Continue with next task even if one fails
				continue;
			}
		}
	}

	if (tasksCreatedCount === 0) {
		console.info("No tasks required for the selected controls.");
		return { tasksCreatedCount: 0 };
	}

	console.info(
		`Created ${tasksCreatedCount} task records for org ${organizationId}`,
	);

	return { tasksCreatedCount };
}

/**
 * Creates artifacts that link controls to their policies.
 *
 * This function:
 * 1. Retrieves all created control records
 * 2. For each control, creates artifacts linking it to its required policies
 *
 * Artifacts are the connections between controls and the policies that
 * demonstrate compliance with those controls.
 *
 * @param organizationId - ID of the organization
 * @param frameworkInstanceIds - IDs of the created framework instances
 * @param relevantControls - Array of controls relevant to the organization
 * @param createdPolicies - Map of template policy IDs to created policy records
 * @returns Object with success status and artifact count
 */
export async function createControlArtifacts(
	organizationId: string,
	frameworkInstanceIds: string[],
	relevantControls: TemplateControl[],
	// Ensure the Map type reflects the actual structure expected/needed, including id
	createdPolicies: Map<
		string,
		{ id: string /* other policy fields if needed */ }
	>,
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	console.info(
		"Creating/Verifying organization control artifacts (Policy links only)",
		{
			organizationId,
			frameworkInstanceIds,
			relevantControlsCount: relevantControls.length,
		},
	);

	// 1. Get all relevant controls from DB
	const dbControls = await prisma.control.findMany({
		where: {
			organizationId,
			name: { in: relevantControls.map((c) => c.name) },
		},
		select: { id: true, name: true },
	});
	const controlMap = new Map<string, { id: string }>();
	for (const control of dbControls) {
		controlMap.set(control.name, control);
	}

	// 2. Fetch Existing Policy Artifacts linked to these controls
	const controlIds = dbControls.map((c) => c.id);
	const existingArtifacts = await prisma.artifact.findMany({
		where: {
			organizationId,
			type: ArtifactType.policy,
			controls: {
				some: {
					id: { in: controlIds },
				},
			},
		},
		select: {
			policyId: true,
			controls: { select: { id: true } }, // Still needed to build the existingLinks set correctly
		},
	});

	// 3. Build Existing Links Set (ControlID-PolicyID)
	const existingLinks = new Set<string>();
	for (const artifact of existingArtifacts) {
		const targetId = artifact.policyId;
		if (!targetId) continue;

		// artifact.controls should be present due to the select statement
		// Add type assertion if linter still complains
		for (const linkedControl of artifact.controls as { id: string }[]) {
			existingLinks.add(`${linkedControl.id}-${targetId}`);
		}
	}
	console.info(`Found ${existingLinks.size} existing policy artifact links.`);

	let artifactsCreatedCount = 0;
	console.info("Attempting to create missing policy artifact links.");

	for (const templateControl of relevantControls) {
		const dbControl = controlMap.get(templateControl.name);
		if (!dbControl) continue;

		for (const templateArtifact of templateControl.mappedArtifacts) {
			if (templateArtifact.type === ArtifactType.policy) {
				const policy = createdPolicies.get(templateArtifact.policyId);
				if (policy?.id) {
					const targetDbId = policy.id;
					const linkKey = `${dbControl.id}-${targetDbId}`;

					if (!existingLinks.has(linkKey)) {
						const createData: Prisma.ArtifactCreateInput = {
							type: ArtifactType.policy,
							policy: { connect: { id: targetDbId } },
							organization: { connect: { id: organizationId } },
							controls: { connect: { id: dbControl.id } },
						};
						try {
							await prisma.artifact.create({ data: createData });
							artifactsCreatedCount++;
							existingLinks.add(linkKey);
						} catch (error) {
							if (
								error instanceof
									Prisma.PrismaClientKnownRequestError &&
								error.code === "P2002"
							) {
								console.warn(
									`Artifact link ${linkKey || "(unknown)"} likely created concurrently, skipping.`,
								);
								existingLinks.add(linkKey);
							} else {
								console.error(
									`Error creating artifact link ${linkKey}`,
									{
										error,
									},
								);
								throw new Error(
									`Failed to create artifact link ${linkKey}`,
								);
							}
						}
					}
				} else {
					console.warn(
						`Policy not found in map for template: ${templateArtifact.policyId} (Control: ${templateControl.name}), skipping artifact.`,
					);
				}
			} // Only policy type is handled
		}
	}

	console.info(
		`Created ${artifactsCreatedCount} new policy artifacts for controls.`,
	);

	return { success: true, artifactsCreated: artifactsCreatedCount };
}
