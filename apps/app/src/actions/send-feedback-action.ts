"use server";

import ky from "ky";
import { authActionClient } from "./safe-action";
import { sendFeedbackSchema } from "./schema";

export const sendFeebackAction = authActionClient
	.schema(sendFeedbackSchema)
	.metadata({
		name: "send-feedback",
	})
	.action(async ({ parsedInput: { feedback }, ctx: { user } }) => {
		if (process.env.DISCORD_WEBHOOK_URL) {
			await ky.post(process.env.DISCORD_WEBHOOK_URL as string, {
				json: {
					content: `New feedback from ${user?.email}: \n\n ${feedback}`,
				},
			});
		}

		return {
			success: true,
		};
	});
