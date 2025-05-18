"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { ArtifactType } from "@prisma/client";
import { headers } from "next/headers";

export interface ControlProgressResponse {
	total: number;
	completed: number;
	progress: number;
	byType: {
		[key: string]: {
			total: number;
			completed: number;
		};
	};
}

export const getOrganizationControlProgress = async (controlId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return {
			error: "Unauthorized",
		};
	}

	const orgId = session.session.activeOrganizationId;

	if (!orgId) {
		return {
			error: "Unauthorized",
		};
	}

	// Get the control with its artifacts
	const control = await db.control.findUnique({
		where: {
			id: controlId,
		},
		include: {
			artifacts: {
				include: {
					policy: true,
				},
			},
			tasks: true,
		},
	});

	if (!control) {
		return {
			error: "Control not found",
		};
	}

	const artifacts = control.artifacts;
	const tasks = control.tasks;
	const progress: ControlProgressResponse = {
		total: artifacts.length + tasks.length,
		completed: 0,
		progress: 0,
		byType: {},
	};

	for (const artifact of artifacts) {
		// Initialize type counters if not exists
		if (!progress.byType[artifact.type]) {
			progress.byType[artifact.type] = {
				total: 0,
				completed: 0,
			};
		}

		progress.byType[artifact.type].total++;

		// Check completion based on artifact type
		let isCompleted = false;
		switch (artifact.type) {
			case ArtifactType.policy:
				isCompleted = artifact.policy?.status === "published";
				break;
			case ArtifactType.procedure:
			case ArtifactType.training:
				// These types might need special handling based on your business logic
				isCompleted = false;
				break;
			default:
				isCompleted = false;
		}

		if (isCompleted) {
			progress.completed++;
			progress.byType[artifact.type].completed++;
		}
	}

	for (const task of tasks) {
		// Initialize type counters if not exists
		if (!progress.byType["control"]) {
			progress.byType["control"] = {
				total: 0,
				completed: 0,
			};
		}

		progress.byType["control"].total++;

		// Check completion based on task status (all tasks here are implicitly control-related)
		const isCompleted = task.status === "done";

		if (isCompleted) {
			progress.completed++;
			progress.byType["control"].completed++;
		}
	}

	// Calculate overall progress percentage
	progress.progress =
		progress.total > 0
			? Math.round((progress.completed / progress.total) * 100)
			: 0;

	return {
		data: {
			progress,
		},
	};
};
