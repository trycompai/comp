"use server";

import { db } from "@comp/db";
import type { FrameworkInstanceWithControls } from "../types";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function getAllFrameworkInstancesWithControls(): Promise<
	FrameworkInstanceWithControls[]
> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.session.activeOrganizationId) {
		throw new Error("No active organization found");
	}

	const frameworksWithControls = await db.frameworkInstance.findMany({
		where: {
			organizationId: session?.session.activeOrganizationId,
		},
		include: {
			controls: {
				include: {
					artifacts: {
						include: {
							policy: true,
							evidence: true,
						},
					},
					requirementsMapped: true,
				},
			},
		},
	});

	return frameworksWithControls;
}
