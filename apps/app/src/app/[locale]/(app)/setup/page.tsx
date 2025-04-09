import { OnboardingClient } from "@/components/forms/create-organization-form";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AcceptInvite } from "./components/accept-invite";
import { getOnboardingForCurrentOrganization } from "@/data/getOnboardingForCurrentOrganization";

export const metadata: Metadata = {
	title: "Organization Setup | Comp AI",
};

export default async function Page() {
	const headersList = await headers();

	const session = await auth.api.getSession({
		headers: headersList,
	});

	if (!session || !session.session) {
		return redirect("/");
	}

	const organization = await db.organization.findFirst({
		where: {
			members: {
				some: {
					userId: session.user.id,
				},
			},
		},
	});

	const hasInvite = await db.invitation.findFirst({
		where: {
			email: session.user.email,
			status: "pending",
		},
	});

	if (!session.session.activeOrganizationId && organization?.id) {
		await auth.api.setActiveOrganization({
			headers: headersList,
			body: {
				organizationId: organization.id,
			},
		});

		const onboarding = await db.onboarding.findUnique({
			where: {
				organizationId: organization.id,
			},
		});

		const completedAll =
			Boolean(onboarding?.team) &&
			Boolean(onboarding?.integrations) &&
			Boolean(onboarding?.vendors) &&
			Boolean(onboarding?.risk);

		if (!completedAll) {
			// This is the onboarding page
			return redirect(`/${organization.id}/home`);
		}

		return redirect(`/${organization.id}/frameworks`);
	}

	if (hasInvite) {
		return <AcceptInvite inviteCode={hasInvite.id} />;
	}

	return <OnboardingClient />;
}
