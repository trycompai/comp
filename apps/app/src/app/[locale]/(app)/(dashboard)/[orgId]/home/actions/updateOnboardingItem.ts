"use server";

import { db } from "@comp/db";
import { Onboarding } from "@comp/db/types";
import { revalidatePath } from "next/cache";

export async function updateOnboardingItem(
	orgId: string,
	onboardingItem: Exclude<keyof Onboarding, "organizationId">,
	value: boolean,
): Promise<{ success: true; error: null } | { success: false; error: string }> {
	try {
		const onboarding = await db.onboarding.findUnique({
			where: { organizationId: orgId },
		});

		if (!onboarding) {
			throw new Error("Onboarding not found");
		}

		await db.onboarding.update({
			where: { organizationId: orgId },
			data: { [onboardingItem]: value },
		});

		revalidatePath(`/${orgId}/home`);

		return { success: true, error: null };
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "An unexpected error occurred",
		};
	}
}
