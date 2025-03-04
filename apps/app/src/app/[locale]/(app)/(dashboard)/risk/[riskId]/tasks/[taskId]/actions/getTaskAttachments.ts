"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

export const getTaskAttachments = authActionClient
	.schema(
		z.object({
			id: z.string(),
		}),
	)
	.metadata({
		name: "getTaskAttachments",
		track: {
			event: "get-task-attachments",
			channel: "server",
		},
	})
	.action(async ({ ctx, parsedInput }) => {
		const { user } = ctx;
		const { id } = parsedInput;

		if (!user.organizationId) {
			return {
				success: false,
				error: "Not authorized - no organization found",
			};
		}

		try {
			const attachments = await db.taskAttachment.findMany({
				where: {
					riskMitigationTaskId: id,
					organizationId: user.organizationId,
				},
				select: {
					fileUrl: true,
					fileKey: true,
				},
			});

			if (!attachments) {
				return {
					success: false,
					error: "Task attachments not found",
				};
			}

			return {
				success: true,
				data: attachments,
			};
		} catch (error) {
			console.error("Error fetching task attachments:", error);
			return {
				success: false,
				error: "Failed to fetch task attachments",
			};
		}
	});
