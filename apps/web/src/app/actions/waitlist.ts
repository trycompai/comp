"use server";

import * as ServerAnalytics from "@bubba/analytics/src/server";
import { resend } from "@bubba/email/lib/resend";
import ky from "ky";
import { createSafeActionClient } from "next-safe-action";
import { waitlistSchema } from "./schema";

interface ZapSubscriberPayload {
	email_address: string;
	referrer: string;
}

export const joinWaitlist = createSafeActionClient()
	.schema(waitlistSchema)
	.action(async ({ parsedInput }) => {
		const kitPayload: ZapSubscriberPayload = {
			email_address: parsedInput.email,
			referrer:
				typeof window !== "undefined"
					? window.location.href
					: "https://trycomp.ai",
		};

		if (!resend) {
			throw new Error("Resend not initialized - missing API key");
		}

		if (process.env.DISCORD_WEBHOOK_URL) {
			await ky.post(process.env.DISCORD_WEBHOOK_URL as string, {
				json: {
					content: `New waitlist signup: ${parsedInput.email}`,
				},
			});
		}

		if (process.env.ZAP_WEBHOOK_URL) {
			await ky.post(process.env.ZAP_WEBHOOK_URL as string, {
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				json: kitPayload,
			});
		}

		await ServerAnalytics.track(parsedInput.email, "waitlist_signup", {
			channel: "web",
			email: parsedInput.email,
		});

		return {
			success: true,
		};
	});
