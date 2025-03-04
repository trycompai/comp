"use server";

import { db, RequirementType, type Policy, type User } from "@bubba/db";
import { authActionClient } from "../safe-action";
import { z } from "zod";
import type { ActionData } from "../types";
import type { InputJsonValue } from "@prisma/client/runtime/library";

const selectFrameworksSchema = z.object({
	frameworkIds: z.array(z.string()),
});

export const selectFrameworksAction = authActionClient
	.schema(selectFrameworksSchema)
	.metadata({
		name: "select-frameworks",
		track: {
			event: "select-frameworks",
			channel: "server",
		},
	})
	.action(async ({ parsedInput, ctx }): Promise<ActionData<true>> => {
		const { frameworkIds } = parsedInput;
		const { user } = ctx;

		if (!user.organizationId) {
			return {
				error: "Not authorized - no organization found",
			};
		}

		try {
			// Create categories
			await createOrganizationCategories(user as User, frameworkIds);

			// Create frameworks and controls
			const organizationFrameworks = await Promise.all(
				frameworkIds.map((frameworkId) =>
					createOrganizationFramework(user as User, frameworkId),
				),
			);

			// Create policies
			await createOrganizationPolicy(user as User, frameworkIds);

			// Create organization evidence first
			await createOrganizationEvidence(user as User, frameworkIds);

			// Create control requirements after evidence is created
			await createOrganizationControlRequirements(
				user as User,
				organizationFrameworks.map((framework) => framework.id),
			);

			return {
				data: true,
			};
		} catch (error) {
			console.error("Error selecting frameworks:", error);
			return {
				error: "Failed to select frameworks",
			};
		}
	});

const createOrganizationFramework = async (user: User, frameworkId: string) => {
	if (!user.organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// Connect the framework to the organization.
	const organizationFramework = await db.organizationFramework.create({
		data: {
			organizationId: user.organizationId,
			frameworkId,
			status: "not_started",
		},
		select: {
			id: true,
		},
	});

	// Get the framework categories and their corresponding organization categories
	const frameworkCategories = await db.frameworkCategory.findMany({
		where: { frameworkId },
		include: {
			controls: true,
		},
	});

	// Get the organization categories that were just created
	const organizationCategories = await db.organizationCategory.findMany({
		where: {
			organizationId: user.organizationId,
			frameworkId,
		},
	});

	// Create controls for each category
	for (const frameworkCategory of frameworkCategories) {
		const organizationCategory = organizationCategories.find(
			(oc) => oc.name === frameworkCategory.name,
		);

		if (!organizationCategory) continue;

		await db.organizationControl.createMany({
			data: frameworkCategory.controls.map((control) => ({
				organizationFrameworkId: organizationFramework.id,
				controlId: control.id,
				organizationId: user.organizationId!,
				status: "not_started",
				organizationCategoryId: organizationCategory.id,
			})),
		});
	}

	return organizationFramework;
};

const createOrganizationPolicy = async (user: User, frameworkIds: string[]) => {
	if (!user.organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	const policies = await db.policy.findMany();
	const policiesForFrameworks: Policy[] = [];

	for (const policy of policies) {
		const usedBy = policy.usedBy;
		if (!usedBy) {
			continue;
		}

		const usedByFrameworkIds = Object.keys(usedBy);

		if (
			usedByFrameworkIds.some((frameworkId) =>
				frameworkIds.includes(frameworkId),
			)
		) {
			policiesForFrameworks.push(policy);
		}
	}

	const organizationPolicies = await db.organizationPolicy.createMany({
		data: policiesForFrameworks.map((policy) => ({
			organizationId: user.organizationId!,
			policyId: policy.id,
			status: "draft",
			content: policy.content as InputJsonValue[],
			frequency: policy.frequency,
		})),
	});

	return organizationPolicies;
};

const createOrganizationCategories = async (
	user: User,
	frameworkIds: string[],
) => {
	if (!user.organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	// For each frameworkCategory we need to get the controls.
	const frameworkCategories = await db.frameworkCategory.findMany({
		where: {
			frameworkId: { in: frameworkIds },
		},
	});

	// Create the organization categories.
	const organizationCategories = await db.organizationCategory.createMany({
		data: frameworkCategories.map((category) => ({
			name: category.name,
			description: category.description,
			organizationId: user.organizationId!,
			frameworkId: category.frameworkId,
		})),
	});

	return organizationCategories;
};

const createOrganizationControlRequirements = async (
	user: User,
	organizationFrameworkIds: string[],
) => {
	if (!user.organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	const controls = await db.organizationControl.findMany({
		where: {
			organizationId: user.organizationId!,
			organizationFrameworkId: {
				in: organizationFrameworkIds,
			},
		},
		include: {
			control: true,
		},
	});

	// Create control requirements for each control
	const controlRequirements = await db.controlRequirement.findMany({
		where: {
			controlId: { in: controls.map((control) => control.controlId) },
		},
		include: {
			policy: true, // Include the policy to get its ID
			evidence: true, // Include the evidence to get its ID
		},
	});

	// Get all organization policies for this organization
	const organizationPolicies = await db.organizationPolicy.findMany({
		where: {
			organizationId: user.organizationId,
		},
	});

	// Get all organization evidences for this organization
	const organizationEvidences = await db.organizationEvidence.findMany({
		where: {
			organizationId: user.organizationId,
		},
	});

	for (const control of controls) {
		const requirements = controlRequirements.filter(
			(req) => req.controlId === control.controlId,
		);

		await db.organizationControlRequirement.createMany({
			data: requirements.map((requirement) => {
				// Find the corresponding organization policy if this is a policy requirement
				const policyId =
					requirement.type === "policy" ? requirement.policy?.id : null;
				const organizationPolicy = policyId
					? organizationPolicies.find((op) => op.policyId === policyId)
					: null;

				const evidenceId =
					requirement.type === "evidence" ? requirement.evidenceId : null;

				console.log({
					evidenceId,
				});

				const organizationEvidence = evidenceId
					? organizationEvidences.find((e) => e.evidenceId === evidenceId)
					: null;

				console.log({
					organizationEvidence,
				});

				return {
					organizationControlId: control.id,
					controlRequirementId: requirement.id,
					type: requirement.type,
					description: requirement.description,
					organizationPolicyId: organizationPolicy?.id || null,
					organizationEvidenceId: organizationEvidence?.id || null,
				};
			}),
		});
	}

	return controlRequirements;
};

const createOrganizationEvidence = async (
	user: User,
	frameworkIds: string[],
) => {
	if (!user.organizationId) {
		throw new Error("Not authorized - no organization found");
	}

	const evidence = await db.controlRequirement.findMany({
		where: {
			type: RequirementType.evidence,
		},
		include: {
			control: {
				include: {
					frameworkCategory: {
						include: {
							framework: true,
						},
					},
				},
			},
		},
	});

	const organizationEvidence = await db.organizationEvidence.createMany({
		data: evidence.map((evidence) => ({
			organizationId: user.organizationId!,
			evidenceId: evidence.id,
			name: evidence.name,
			description: evidence.description,
			frequency: evidence.frequency,
			frameworkId: evidence.control.frameworkCategory?.framework.id || "",
			assigneeId: user.id,
		})),
	});

	return organizationEvidence;
};
