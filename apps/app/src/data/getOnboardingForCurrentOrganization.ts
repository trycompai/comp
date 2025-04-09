"use server";

import { db } from "@comp/db";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function getOnboardingForCurrentOrganization() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("Not authenticated");
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		throw new Error("No organization ID");
	}

	const onboarding = await db.onboarding.findUnique({
		where: {
			organizationId,
		},
	});

	const completedAll =
		Boolean(onboarding?.team) &&
		Boolean(onboarding?.integrations) &&
		Boolean(onboarding?.vendors) &&
		Boolean(onboarding?.risk);

	return {
		onboarding,
		completedAll,
	};
}
