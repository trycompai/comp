import { OnboardingClient } from "@/components/forms/create-organization-form";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AcceptInvite } from "./components/accept-invite";

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

	if (
		!session.session.activeOrganizationId &&
		organization?.id &&
		!hasInvite
	) {
		await auth.api.setActiveOrganization({
			headers: headersList,
			body: {
				organizationId: organization.id,
			},
		});

		return redirect(`/${organization.id}/frameworks`);
	}

	if (hasInvite) {
		const organization = await db.organization.findUnique({
			where: {
				id: hasInvite.organizationId,
			},
			select: {
				name: true,
			},
		});

		return (
			<AcceptInvite
				inviteCode={hasInvite.id}
				organizationName={organization?.name || ""}
			/>
		);
	}

	return <OnboardingClient />;
}
