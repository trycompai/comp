import { db } from "@comp/db";
import { Checklist } from "./components/Checklist";
import { ChecklistItemProps } from "./types/ChecklistProps.types";

export default async function Page({
	params,
}: {
	params: Promise<{ orgId: string }>;
}) {
	const { orgId } = await params;
	const onboarding = await db.onboarding.findUnique({
		where: {
			organizationId: orgId,
		},
	});

	if (!onboarding) {
		return <div>Organization onboarding not found</div>;
	}

	const checklistItems: ChecklistItemProps[] = [
		{
			title: "Team Collaboration",
			description: "Invite your colleagues to help manage compliance tasks.",
			href: "/:organizationId/settings/members",
			dbColumn: "team",
			completed: onboarding.team,
		},
		{
			title: "Connect Integrations",
			description:
				"Connect integrations to automate certain tasks, import existing relevant data and invite your employees to complete training.",
			href: "/:organizationId/integrations",
			dbColumn: "integrations",
			completed: onboarding.integrations,
		},
		{
			title: "Define your Vendors",
			description:
				"Document your third-party relationships to calculate and mitigate potential risks.",
			href: "/:organizationId/vendors",
			dbColumn: "vendors",
			completed: onboarding.vendors,
		},
		{
			title: "Define your Risks",
			description: "Identify and assess potential risks to your organization.",
			href: "/:organizationId/risks",
			dbColumn: "risk",
			completed: onboarding.risk,
		},
	];

	return <Checklist items={checklistItems} />;
}
