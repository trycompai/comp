import type {
	TemplateControl,
	TemplateEvidence,
	TemplatePolicy,
} from "@comp/data";
import { controls, evidence, frameworks, policies } from "@comp/data";
import { db } from "@comp/db";
import { FrameworkId, type PolicyStatus, RequirementId } from "@prisma/client";
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
			frameworkIds.includes(req.frameworkId as FrameworkId),
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
	const framework = frameworks[frameworkId as FrameworkId];

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
					frameworkId: frameworkId as FrameworkId,
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
					frameworkId: frameworkId as FrameworkId,
				},
			})
		: await prisma.frameworkInstance.create({
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
		control.mappedRequirements.some(
			(req) => req.frameworkId === frameworkId,
		),
	);

	// Prepare data for batch control creation
	const controlsToCreate = frameworkControls.map((control) => ({
		organizationId,
		name: control.name,
		description: control.description,
		// We connect frameworkInstances later or handle differently if createMany doesn't support relation connection easily
	}));

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
	frameworkInstance: { id: string; frameworkId: FrameworkId },
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
		requirementId: RequirementId;
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
			const requirementEnumKey =
				`${frameworkInstance.frameworkId}_${requirement.requirementId}` as keyof typeof RequirementId;

			// Validate that the constructed key actually exists in the enum
			if (!(requirementEnumKey in RequirementId)) {
				console.error(
					`Invalid RequirementId constructed: ${requirementEnumKey}. It does not exist in the RequirementId enum. Skipping map creation for this requirement.`,
					{
						frameworkId: frameworkInstance.frameworkId,
						requirementIdPart: requirement.requirementId,
						controlName: templateControl.name,
					},
				);
				continue; // Skip this requirement if the enum key is invalid
			}

			requirementMapsToCreate.push({
				controlId: control.id,
				frameworkInstanceId: frameworkInstance.id,
				// Use the valid enum member looked up by the constructed key
				requirementId: RequirementId[requirementEnumKey],
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
	// Fetch organization details for placeholder replacement
	const organizationRecord = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { name: true },
	});

	if (!organizationRecord) {
		// This should ideally not happen if the orgId is validated earlier
		console.error(
			`Organization record not found for ID: ${organizationId} during policy creation.`,
		);
		throw new Error(`Organization ${organizationId} not found.`);
	}

	// Fetch member record for assignee
	const memberRecord = await prisma.member.findFirst({
		where: { organizationId, userId },
		select: { id: true },
	});
	if (!memberRecord) {
		console.warn(
			`Member record not found for user: ${userId} in org ${organizationId}. Cannot assign policies.`,
		);
	}

	// Prepare placeholder replacements
	const currentDate = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD
	const replacements = {
		"{{organization}}": organizationRecord.name,
		"{{date}}": currentDate,
		// Add other potential placeholders and their values here
	};

	const policiesToCreateData: Prisma.PolicyCreateManyInput[] = [];
	for (const templateId of missingTemplateIds) {
		const policyTemplate = requiredTemplatesMap.get(templateId)!;
		// Process content to replace placeholders
		const processedContent = replacePlaceholdersInContent(
			policyTemplate.content as InputJsonValue[], // Cast needed as InputJsonValue is broad
			replacements,
		);

		policiesToCreateData.push({
			organizationId,
			name: policyTemplate.metadata.name,
			description: policyTemplate.metadata.description,
			status: "draft" as PolicyStatus,
			content: processedContent, // Use the processed content
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
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// 1. Gather Required Template IDs and map templateId -> template
	const requiredTemplatesMap = new Map<string, TemplateEvidence>();
	for (const control of relevantControls) {
		for (const artifact of control.mappedArtifacts) {
			if (
				artifact.type === "evidence" &&
				!requiredTemplatesMap.has(artifact.evidenceId)
			) {
				const evidenceTemplate = getEvidenceById(artifact.evidenceId);
				if (evidenceTemplate) {
					requiredTemplatesMap.set(
						artifact.evidenceId,
						evidenceTemplate,
					);
				} else {
					console.warn(
						`Evidence template not found: ${artifact.evidenceId}`,
					);
				}
			}
		}
	}

	const requiredTemplateIds = Array.from(requiredTemplatesMap.keys());

	if (requiredTemplateIds.length === 0) {
		console.info("No evidence required for the selected controls.");
		return new Map<string, any>();
	}

	console.info("Required evidence templates identified", {
		organizationId,
		count: requiredTemplateIds.length,
		templateIds: requiredTemplateIds,
	});

	// 2. Check Existing Records
	const existingDbEvidence = await prisma.evidence.findMany({
		where: {
			organizationId,
			name: {
				in: requiredTemplateIds.map(
					(id) => requiredTemplatesMap.get(id)!.name,
				),
			},
		},
	});
	const existingEvidenceNameMap = new Map(
		existingDbEvidence.map((e) => [e.name, e]),
	);
	const finalEvidenceMap = new Map<string, any>();

	// Populate map with existing evidence, keyed by template ID
	for (const [templateId, template] of requiredTemplatesMap.entries()) {
		const existingEvidence = existingEvidenceNameMap.get(template.name);
		if (existingEvidence) {
			finalEvidenceMap.set(templateId, existingEvidence);
		}
	}

	// 3. Identify Missing Templates
	const missingTemplateIds = requiredTemplateIds.filter(
		(templateId) => !finalEvidenceMap.has(templateId),
	);

	if (missingTemplateIds.length === 0) {
		console.info("All required evidence already exists.");
		return finalEvidenceMap; // Return map containing only existing evidence
	}

	console.info("Evidence to be created", {
		organizationId,
		count: missingTemplateIds.length,
		templateIds: missingTemplateIds,
	});

	// Prepare data for missing evidence
	const memberRecord = await prisma.member.findFirst({
		where: { organizationId, userId, isActive: true },
		select: { id: true },
	});
	if (!memberRecord) {
		console.warn(
			`Active member record not found for user: ${userId} in org ${organizationId}. Cannot assign evidence.`,
		);
	}

	const evidenceToCreateData: Prisma.EvidenceCreateManyInput[] = [];
	for (const templateId of missingTemplateIds) {
		const evidenceTemplate = requiredTemplatesMap.get(templateId)!;
		evidenceToCreateData.push({
			organizationId,
			name: evidenceTemplate.name,
			description: evidenceTemplate.description,
			frequency: evidenceTemplate.frequency,
			assigneeId: memberRecord?.id || null,
			department: evidenceTemplate.department,
			additionalUrls: [],
			fileUrls: [],
		});
	}

	// 4. Create Only Missing Records
	if (evidenceToCreateData.length > 0) {
		try {
			await prisma.evidence.createMany({
				data: evidenceToCreateData,
				skipDuplicates: true, // Keep for safety
			});
			console.info(
				`Batch created ${evidenceToCreateData.length} evidence records for org ${organizationId}`,
			);

			// Fetch the newly created evidence to add them to the map
			const newlyCreatedDbEvidence = await prisma.evidence.findMany({
				where: {
					organizationId,
					name: { in: evidenceToCreateData.map((e) => e.name) },
				},
			});
			const newEvidenceNameMap = new Map(
				newlyCreatedDbEvidence.map((e) => [e.name, e]),
			);

			// 5. Combine and Return Map (Add newly created evidence)
			for (const templateId of missingTemplateIds) {
				const evidenceTemplate = requiredTemplatesMap.get(templateId)!;
				const newEvidence = newEvidenceNameMap.get(
					evidenceTemplate.name,
				);
				if (newEvidence) {
					finalEvidenceMap.set(templateId, newEvidence);
				} else {
					console.warn(
						`Could not find newly created evidence in DB for template: ${templateId} (Name: ${evidenceTemplate.name})`,
					);
				}
			}
		} catch (error) {
			console.error(
				`Error batch creating evidence records for org ${organizationId}`,
				{ error },
			);
			throw new Error("Failed to create organization evidence");
		}
	}

	return finalEvidenceMap;
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
	txClient?: Prisma.TransactionClient,
) {
	const prisma: Prisma.TransactionClient | PrismaClient = txClient ?? db;

	if (!organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	console.info("Creating/Verifying organization control artifacts", {
		organizationId,
		frameworkInstanceIds,
		relevantControlsCount: relevantControls.length,
	});

	// 1. Get all relevant controls from DB for this organization
	const dbControls = await prisma.control.findMany({
		where: {
			organizationId,
			// Filter by name based on relevantControls to narrow down the search
			name: { in: relevantControls.map((c) => c.name) },
		},
		select: { id: true, name: true }, // Select only necessary fields
	});

	// Create a mapping from control name to database control record for efficient lookup
	const controlMap = new Map<string, { id: string }>();
	for (const control of dbControls) {
		controlMap.set(control.name, control);
	}

	// 2. Fetch Existing Artifacts linked to these controls
	const controlIds = dbControls.map((c) => c.id);
	const existingArtifacts = await prisma.artifact.findMany({
		where: {
			organizationId,
			controls: {
				some: {
					id: { in: controlIds },
				},
			},
		},
		select: {
			policyId: true,
			evidenceId: true,
			controls: { select: { id: true } }, // Fetch linked control IDs
		},
	});

	// 3. Build Existing Links Set (ControlID-PolicyID or ControlID-EvidenceID)
	const existingLinks = new Set<string>();
	for (const artifact of existingArtifacts) {
		const targetId = artifact.policyId ?? artifact.evidenceId;
		if (!targetId) continue; // Should not happen if schema is correct

		// An artifact might be linked to multiple controls, iterate through them
		for (const linkedControl of artifact.controls) {
			// Revert to template literal as preferred by linter
			existingLinks.add(`${linkedControl.id}-${targetId}`);
		}
	}
	console.info(`Found ${existingLinks.size} existing artifact links.`);

	let artifactsCreatedCount = 0;
	// Removed the batch preparation array and related variables

	console.info("Attempting to create missing artifact links.");

	for (const templateControl of relevantControls) {
		const dbControl = controlMap.get(templateControl.name);
		if (!dbControl) continue;

		for (const templateArtifact of templateControl.mappedArtifacts) {
			let createData: Prisma.ArtifactCreateInput | null = null;
			let linkKey: string | null = null; // Initialize linkKey as potentially null

			if (templateArtifact.type === "policy") {
				const policy = createdPolicies.get(templateArtifact.policyId);
				// Ensure policy and policy.id exist before proceeding
				if (policy?.id) {
					const targetDbId = policy.id;
					// Revert to template literal as preferred by linter
					linkKey = `${dbControl.id}-${targetDbId}`;

					// Check existence only if linkKey is valid
					if (!existingLinks.has(linkKey)) {
						createData = {
							type: "policy",
							policy: { connect: { id: targetDbId } },
							organization: { connect: { id: organizationId } },
							controls: { connect: { id: dbControl.id } },
						};
					}
				} else {
					console.warn(
						`Policy not found in map for template: ${templateArtifact.policyId} (Control: ${templateControl.name}), skipping artifact.`,
					);
				}
			} else if (templateArtifact.type === "evidence") {
				const evidenceRecord = createdEvidence.get(
					templateArtifact.evidenceId,
				);
				// Ensure evidenceRecord and evidenceRecord.id exist before proceeding
				if (evidenceRecord?.id) {
					const targetDbId = evidenceRecord.id;
					// Revert to template literal as preferred by linter
					linkKey = `${dbControl.id}-${targetDbId}`;

					// Check existence only if linkKey is valid
					if (!existingLinks.has(linkKey)) {
						createData = {
							type: "evidence",
							evidence: { connect: { id: targetDbId } },
							organization: { connect: { id: organizationId } },
							controls: { connect: { id: dbControl.id } },
						};
					}
				} else {
					console.warn(
						`Evidence not found in map for template: ${templateArtifact.evidenceId} (Control: ${templateControl.name}), skipping artifact.`,
					);
				}
			}

			// Create artifact only if createData is set (meaning link didn't exist) and linkKey is valid
			if (createData && linkKey) {
				// Local variable for catch block scope
				const currentLinkKey = linkKey;
				try {
					await prisma.artifact.create({ data: createData });
					artifactsCreatedCount++;
					existingLinks.add(currentLinkKey); // Add to set after successful creation
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === "P2002"
					) {
						// Handle potential race condition
						// Check linkKey again for safety in error logging
						console.warn(
							`Artifact link ${currentLinkKey || "(unknown)"} likely created concurrently, skipping.`,
						);
						// Add it to the set anyway if race condition occurred
						existingLinks.add(currentLinkKey);
					} else {
						// Check linkKey again for safety in error logging
						const errorLinkKey = currentLinkKey || "(unknown)";
						console.error(
							`Error creating artifact link ${errorLinkKey}`,
							{
								error,
							},
						);
						throw new Error(
							`Failed to create artifact link ${errorLinkKey}`,
						);
					}
				}
			}
		}
	}

	console.info(
		`Created ${artifactsCreatedCount} new artifacts for controls.`,
	);

	return { success: true, artifactsCreated: artifactsCreatedCount };
}

// --- Helper Functions for Placeholder Replacement ---

/**
 * Recursively traverses a JSON-like structure (policy content) and replaces placeholder strings.
 * Handles nested arrays and objects, specifically targeting 'text' nodes.
 *
 * @param node - The current node (object, array, or primitive) being processed.
 * @param replacements - A map of placeholder strings (e.g., '{{organization}}') to their replacement values.
 * @returns The node with placeholders replaced.
 */
function replacePlaceholdersRecursive(
	node: any,
	replacements: Record<string, string>,
): any {
	if (Array.isArray(node)) {
		// If it's an array, map over its elements and apply recursion
		return node.map((item) =>
			replacePlaceholdersRecursive(item, replacements),
		);
	}

	if (typeof node === "object" && node !== null) {
		// If it's an object, create a shallow copy to avoid modifying the original template
		const newNode: Record<string, any> = { ...node };

		// Specifically target nodes of type 'text' with a 'text' property
		if (newNode.type === "text" && typeof newNode.text === "string") {
			let newText = newNode.text;
			// Iterate through all placeholders and replace them
			for (const [placeholder, value] of Object.entries(replacements)) {
				// Escape regex special characters in the placeholder key
				const escapedPlaceholder = placeholder.replace(
					/[.*+?^${}()|[\]\\]/g,
					"\\$&",
				);
				// Use a global regex to replace all occurrences
				const regex = new RegExp(escapedPlaceholder, "g");
				newText = newText.replace(regex, value);
			}
			newNode.text = newText;
		}

		// Recursively process 'content' property if it exists and is an array or object
		if (newNode.content) {
			newNode.content = replacePlaceholdersRecursive(
				newNode.content,
				replacements,
			);
		}

		// Recursively process 'attrs' property if it exists and is an object
		// (Handles cases where placeholders might be in attributes)
		if (typeof newNode.attrs === "object" && newNode.attrs !== null) {
			newNode.attrs = replacePlaceholdersRecursive(
				newNode.attrs,
				replacements,
			);
		}

		return newNode;
	}

	// Return primitives or unexpected types as is
	return node;
}

/**
 * Wrapper function to start the placeholder replacement process on policy content.
 * Ensures the initial content is treated as an array.
 *
 * @param content - The policy content array (expected format from templates).
 * @param replacements - A map of placeholder strings to their replacement values.
 * @returns The policy content array with placeholders replaced.
 */
function replacePlaceholdersInContent(
	content: InputJsonValue[],
	replacements: Record<string, string>,
): InputJsonValue[] {
	// Ensure content is actually an array before processing
	if (!Array.isArray(content)) {
		console.warn(
			"Policy content is not in the expected array format. Skipping placeholder replacement.",
			{ content },
		);
		// Return the original content or handle error as appropriate
		// Casting back to InputJsonValue[] assuming it should have been an array
		return content as InputJsonValue[];
	}
	// Start the recursive replacement process
	return replacePlaceholdersRecursive(
		content,
		replacements,
	) as InputJsonValue[];
}
