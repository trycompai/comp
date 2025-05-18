"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
	companyDetailsLatestVersion,
	companyDetailsObjectSchema,
} from "../../../lib/models/CompanyDetails";
import { WIZARD_ID_TO_DB_COLUMN, WizardIds } from "../types/companyDetails";

const WIZARD_ID_TO_SCHEMA = {
	[WizardIds.CompanyDetails]: companyDetailsObjectSchema,
} as const;

export const updateWizard = async ({
	wizardId,
	data,
}: {
	wizardId: WizardIds;
	data: z.infer<typeof companyDetailsObjectSchema>;
}) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const orgId = session?.session.activeOrganizationId;

	if (!orgId) {
		return { error: "No organization found", success: false };
	}

	const dbColumn =
		WIZARD_ID_TO_DB_COLUMN[wizardId as keyof typeof WIZARD_ID_TO_DB_COLUMN];

	const schema =
		WIZARD_ID_TO_SCHEMA[wizardId as keyof typeof WIZARD_ID_TO_SCHEMA];

	if (!dbColumn || !schema) {
		return { error: "Invalid wizard id", success: false };
	}

	let parsed: z.infer<typeof companyDetailsObjectSchema>;
	try {
		parsed = schema.parse(data);
	} catch (err) {
		return { error: "Validation failed", success: false };
	}

	const onboarding = await db.onboarding.findUnique({
		where: { organizationId: orgId },
	});

	await db.onboarding.upsert({
		where: {
			organizationId: orgId,
		},
		create: {
			organizationId: orgId,
			[dbColumn]: {
				version: parsed.version || companyDetailsLatestVersion,
				isCompleted: parsed.isCompleted,
				data: parsed.data,
			},
		},
		update: {
			[dbColumn]: {
				version: parsed.version || companyDetailsLatestVersion,
				isCompleted: parsed.isCompleted,
				data: parsed.data,
			},
		},
	});

	revalidatePath(`/${orgId}/implementation/wizard/${wizardId}`);

	return { success: true, error: null };
};
