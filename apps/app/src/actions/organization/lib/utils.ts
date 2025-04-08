import type {
	TemplateControl,
	TemplateEvidence,
	TemplatePolicy,
} from "@comp/data";
import { controls, evidence, frameworks, policies } from "@comp/data";
import { db } from "@comp/db";
import { FrameworkId, type PolicyStatus, RequirementId } from "@prisma/client";
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
 * A type-safe wrapper for accessing evidence templates by ID
 *
 * @param id - The ID of the evidence to retrieve
 * @returns The evidence template or undefined if not found
 */
export function getEvidenceById(id: string): TemplateEvidence | undefined {
	// Use a type-safe approach to check if the key exists in the evidence object
	return Object.entries(evidence).find(([key]) => key === id)?.[1];
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
	frameworkIds: FrameworkId[],
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
	frameworkId: FrameworkId,
) {
	// First verify the organization exists
	const organization = await db.organization.findUnique({
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
	const framework = frameworks[frameworkId as FrameworkId];

	if (!framework) {
		console.error("Framework not found when creating organization framework", {
			organizationId,
			frameworkId,
		});
		throw new Error(`Framework with ID ${frameworkId} not found`);
	}

	// Check if a framework instance already exists
	const existingFrameworkInstance = await db.frameworkInstance.findUnique({
		where: {
			organizationId_frameworkId: {
				organizationId,
				frameworkId: frameworkId as FrameworkId,
			},
		},
	});

	// Create or update the framework instance
	const frameworkInstance = existingFrameworkInstance
		? await db.frameworkInstance.update({
				where: {
					id: existingFrameworkInstance.id,
				},
				data: {
					organizationId,
					frameworkId: frameworkId as FrameworkId,
				},
			})
		: await db.frameworkInstance.create({
				data: {
					organizationId,
					frameworkId: frameworkId as FrameworkId,
				},
			});

	console.info("Created/updated organization framework", {
		organizationId,
		frameworkId,
		frameworkInstanceId: frameworkInstance.id,
	});

	// Find all controls that apply to this specific framework
	const frameworkControls = controls.filter((control) =>
		control.mappedRequirements.some((req) => req.frameworkId === frameworkId),
	);

	// Create database records for each control
	const createdControls = [];
	for (const control of frameworkControls) {
		const createdControl = await db.control.create({
			data: {
				organizationId,
				name: control.name,
				description: control.description,
				frameworkInstances: {
					connect: {
						id: frameworkInstance.id,
					},
				},
			},
		});

		createdControls.push(createdControl);

		console.info("Created control", {
			controlName: control.name,
			frameworkId,
		});
	}

	// Create requirement maps for the controls
	await createRequirementMaps(
		{ id: frameworkInstance.id, frameworkId },
		createdControls,
		frameworkControls,
	);

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
 * @param controls - Array of created control records
 * @param templateControls - Array of control templates with requirement mappings
 * @returns The number of requirement maps created
 */
export async function createRequirementMaps(
	frameworkInstance: { id: string; frameworkId: FrameworkId },
	controls: { id: string; name: string }[],
	templateControls: TemplateControl[],
) {
	console.info("Creating requirement maps", {
		frameworkInstanceId: frameworkInstance.id,
		controlCount: controls.length,
	});

	let requirementMapsCreated = 0;

	// Create a map for efficient control lookup
	const controlMap = new Map(
		controls.map((control) => [control.name, control]),
	);

	// For each template control
	for (const templateControl of templateControls) {
		// Find the corresponding created control
		const control = controlMap.get(templateControl.name);
		if (!control) {
			console.warn(`Control not found for template: ${templateControl.name}`);
			continue;
		}

		// Get requirements for this framework
		const frameworkRequirements = templateControl.mappedRequirements.filter(
			(req) => req.frameworkId === frameworkInstance.frameworkId,
		);

		// Create requirement maps
		for (const requirement of frameworkRequirements) {
			try {
				await db.requirementMap.create({
					data: {
						controlId: control.id,
						frameworkInstanceId: frameworkInstance.id,
						requirementId:
							`${frameworkInstance.frameworkId}_${requirement.requirementId}` as RequirementId,
					},
				});

				requirementMapsCreated++;
			} catch (error) {
				console.error(
					`Error creating requirement map for control ${control.name}`,
					{
						error,
						requirementId: requirement.requirementId,
					},
				);
			}
		}
	}

	console.info(`Created ${requirementMapsCreated} requirement maps`);

	return requirementMapsCreated;
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
) {
	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// Extract all policy IDs required by the controls
	const policyIds = new Set<string>();

	for (const control of relevantControls) {
		for (const artifact of control.mappedArtifacts) {
			if (artifact.type === "policy") {
				policyIds.add(artifact.policyId);
			}
		}
	}

	console.info("Creating organization policies", {
		organizationId,
		policyCount: policyIds.size,
		policyIds: Array.from(policyIds),
	});

	// Create policies for the organization
	const createdPolicies = new Map<string, any>();

	// Process each policy using the type-safe accessor function
	for (const policyId of policyIds) {
		const policyTemplate = getPolicyById(policyId);

		if (!policyTemplate) {
			console.warn(`Policy template not found: ${policyId}`);
			continue;
		}

		// Find the member record for the user in this organization
		const memberRecord = await db.member.findFirst({
			where: {
				organizationId,
				userId,
			},
		});

		if (!memberRecord) {
			console.warn(`Member record not found for user: ${userId}`);
			continue;
		}

		try {
			// Create the policy record using template data - include only fields in the schema
			const policy = await db.policy.create({
				data: {
					organizationId,
					name: policyTemplate.metadata.name,
					description: policyTemplate.metadata.description,
					status: "draft" as PolicyStatus,
					content: policyTemplate.content as InputJsonValue[],
					assigneeId: memberRecord?.id || null,
					frequency: policyTemplate.metadata.frequency,
					department: policyTemplate.metadata.department,
				},
			});

			// Store both the policy record and template ID for later reference
			createdPolicies.set(policyId, {
				...policy,
				templateId: policyId, // Store the template ID for reference
			});

			console.info(`Created policy: ${policy.name}`, {
				policyName: policy.name,
				templateId: policyId,
			});
		} catch (error) {
			console.error(`Error creating policy ${policyId}`, { error });
		}
	}

	return createdPolicies;
}

/**
 * Creates evidence records for the organization based on control requirements.
 *
 * This function:
 * 1. Identifies all evidence requirements from the relevant controls
 * 2. Creates evidence records using templates from the data package
 * 3. Records which evidence was created for later artifact linking
 *
 * Evidence represents the actual documentation, reports, logs, etc. that
 * organizations must collect to demonstrate compliance with their controls.
 *
 * @param organizationId - ID of the organization
 * @param relevantControls - Array of controls relevant to the organization
 * @param userId - ID of the user creating the organization (becomes evidence assignee)
 * @returns Map of template evidence IDs to created evidence records
 */
export async function createOrganizationEvidence(
	organizationId: string,
	relevantControls: TemplateControl[],
	userId: string,
) {
	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// Extract all evidence IDs required by the controls
	const evidenceIds = new Set<string>();

	for (const control of relevantControls) {
		for (const artifact of control.mappedArtifacts) {
			if (artifact.type === "evidence") {
				evidenceIds.add(artifact.evidenceId);
			}
		}
	}

	console.info("Creating evidence record instances", {
		organizationId,
		evidenceCount: evidenceIds.size,
		evidenceIds: Array.from(evidenceIds),
	});

	// Find the member record for the user in this organization
	const memberRecord = await db.member.findFirst({
		where: {
			organizationId,
			userId,
			isActive: true,
		},
	});

	// Create evidence records for the organization
	const createdEvidence = new Map<string, any>();

	// Process each evidence using the type-safe accessor function
	for (const evidenceId of evidenceIds) {
		const evidenceTemplate = getEvidenceById(evidenceId);

		if (!evidenceTemplate) {
			console.warn(`Evidence template not found: ${evidenceId}`);
			continue;
		}

		try {
			// Create the evidence record using template data - include only fields in the schema
			const evidenceRecord = await db.evidence.create({
				data: {
					organizationId,
					name: evidenceTemplate.name,
					description: evidenceTemplate.description,
					frequency: evidenceTemplate.frequency,
					assigneeId: memberRecord?.id || null, // Use the member ID if found, otherwise null
					department: evidenceTemplate.department,
					additionalUrls: [],
					fileUrls: [],
				},
			});

			// Store both the evidence record and template ID for later reference
			createdEvidence.set(evidenceId, {
				...evidenceRecord,
				templateId: evidenceId, // Store the template ID for reference
			});

			console.info(`Created evidence: ${evidenceRecord.name}`, {
				evidenceId: evidenceRecord.id,
				templateId: evidenceId,
			});
		} catch (error) {
			console.error(`Error creating evidence record ${evidenceId}`, { error });
		}
	}

	return createdEvidence;
}

/**
 * Creates artifacts that link controls to their policies and evidence.
 *
 * This function:
 * 1. Retrieves all created control records
 * 2. For each control, creates artifacts linking it to its required policies and evidence
 *
 * Artifacts are the connections between controls and the policies/evidence that
 * demonstrate compliance with those controls. They represent the actual implementation
 * of compliance requirements.
 *
 * @param organizationId - ID of the organization
 * @param frameworkInstanceIds - IDs of the created framework instances
 * @param relevantControls - Array of controls relevant to the organization
 * @param createdPolicies - Map of template policy IDs to created policy records
 * @param createdEvidence - Map of template evidence IDs to created evidence records
 * @returns Object with success status and artifact count
 */
export async function createControlArtifacts(
	organizationId: string,
	frameworkInstanceIds: string[],
	relevantControls: TemplateControl[],
	createdPolicies: Map<string, any>,
	createdEvidence: Map<string, any>,
) {
	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	console.info("Creating organization control artifacts", {
		organizationId,
		frameworkInstanceIds,
		relevantControlsCount: relevantControls.length,
	});

	// Get all controls for this organization and framework instances
	const dbControls = await db.control.findMany({
		where: {
			organizationId,
			frameworkInstances: {
				some: {
					id: {
						in: frameworkInstanceIds,
					},
				},
			},
		},
	});

	// Create a mapping from control name to database control record for efficient lookup
	const controlMap = new Map<string, any>();
	for (const control of dbControls) {
		controlMap.set(control.name, control);
	}

	// Create artifacts for each control
	let artifactsCreated = 0;

	for (const control of relevantControls) {
		const dbControl = controlMap.get(control.name);

		if (!dbControl) {
			console.warn(`Control not found in database: ${control.name}`);
			continue;
		}

		// Create artifacts for each policy and evidence mapped to this control
		for (const artifact of control.mappedArtifacts) {
			try {
				if (artifact.type === "policy") {
					// Link control to a policy
					const policy = createdPolicies.get(artifact.policyId);

					if (!policy) {
						console.warn(`Policy not found for artifact: ${artifact.policyId}`);
						continue;
					}

					// Create the policy artifact
					await db.artifact.create({
						data: {
							type: "policy",
							policyId: policy.id,
							organizationId,
							controls: {
								connect: {
									id: dbControl.id,
								},
							},
						},
					});

					artifactsCreated++;
				} else if (artifact.type === "evidence") {
					// Link control to evidence
					const evidenceRecord = createdEvidence.get(artifact.evidenceId);

					if (!evidenceRecord) {
						console.warn(
							`Evidence not found for artifact: ${artifact.evidenceId}`,
						);
						continue;
					}

					// Create the evidence artifact
					await db.artifact.create({
						data: {
							type: "evidence",
							evidenceId: evidenceRecord.id,
							organizationId,
							controls: {
								connect: {
									id: dbControl.id,
								},
							},
						},
					});

					artifactsCreated++;
				}
			} catch (error) {
				console.error(`Error creating artifact for control ${control.name}`, {
					error,
				});
			}
		}
	}

	console.info(`Created ${artifactsCreated} artifacts for controls`);

	return { success: true, artifactsCreated };
}
