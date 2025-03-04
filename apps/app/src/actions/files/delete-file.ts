"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";

import { UPLOAD_TYPE } from "@/actions/types";

type UploadType = (typeof UPLOAD_TYPE)[keyof typeof UPLOAD_TYPE];

const schema = z.discriminatedUnion("uploadType", [
	z.object({
		uploadType: z.literal(UPLOAD_TYPE.evidence),
		evidenceId: z.string(),
		fileUrl: z.string(),
	}),
	z.object({
		uploadType: z.literal(UPLOAD_TYPE.riskTask),
		taskId: z.string(),
		fileUrl: z.string(),
	}),
]);

interface SuccessResponse {
	success: true;
}

interface ErrorResponse {
	success: false;
	error: string;
}

type ActionResponse = SuccessResponse | ErrorResponse;

export const deleteFile = authActionClient
	.schema(schema)
	.metadata({
		name: "deleteFile",
		track: {
			event: "delete-file",
			channel: "server",
		},
	})
	.action(async ({ parsedInput, ctx }): Promise<ActionResponse> => {
		const { user } = ctx;
		const { uploadType, fileUrl } = parsedInput;

		if (!user.organizationId) {
			return {
				success: false,
				error: "Not authorized - no organization found",
			};
		}

		try {
			if (uploadType === UPLOAD_TYPE.evidence) {
				const evidenceId = parsedInput.evidenceId;

				const evidence = await db.organizationEvidence.findFirst({
					where: {
						id: evidenceId,
						organizationId: user.organizationId,
					},
				});

				if (!evidence) {
					return {
						success: false,
						error: "Evidence not found",
					};
				}

				await db.organizationEvidence.update({
					where: { id: evidenceId },
					data: {
						fileUrls: {
							set: evidence.fileUrls.filter((url) => url !== fileUrl),
						},
					},
				});

				return {
					success: true,
				};
			}

			if (uploadType === UPLOAD_TYPE.riskTask) {
				const taskId = parsedInput.taskId;

				const task = await db.riskMitigationTask.findFirst({
					where: {
						id: taskId,
						organizationId: user.organizationId,
						TaskAttachment: {
							some: {
								fileUrl,
							},
						},
					},
				});

				if (!task) {
					return {
						success: false,
						error: "Task not found",
					};
				}

				await db.riskMitigationTask.update({
					where: { id: taskId },
					data: {
						TaskAttachment: {
							deleteMany: {
								fileUrl,
							},
						},
					},
				});

				return {
					success: true,
				};
			}

			return {
				success: false,
				error: "Invalid upload type",
			};
		} catch (error) {
			console.error("Error deleting file:", error);
			return {
				success: false,
				error: "Failed to delete file",
			};
		}
	});
