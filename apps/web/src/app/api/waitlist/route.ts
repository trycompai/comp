"use server";

import { resend } from "@bubba/email/lib/resend";
import { metadata } from "@trigger.dev/sdk/v3";
import ky from "ky";
import { NextResponse } from "next/server";
import { track } from "@bubba/analytics";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const email = searchParams.get("email");

	if (!email) {
		return NextResponse.json({ error: "Email is required" }, { status: 400 });
	}

	try {
		if (resend) {
			resend.contacts.create({
				email,
				firstName: email.charAt(0).toUpperCase() + email.split("@")[0].slice(1),
				audienceId: process.env.RESEND_AUDIENCE_ID as string,
			});

			if (process.env.DISCORD_WEBHOOK_URL) {
				await ky.post(process.env.DISCORD_WEBHOOK_URL as string, {
					json: {
						content: `New waitlist signup: ${email}`,
					},
				});
			}

			await track(email, "waitlist_signup");
		}

		return NextResponse.redirect(new URL("/success", request.url));
	} catch (error) {
		console.error("Error adding to waitlist:", error);
		return NextResponse.json(
			{ error: "Failed to add to waitlist" },
			{ status: 500 },
		);
	}
}
