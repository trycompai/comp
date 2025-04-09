import { QuestionRenderer } from "./components/QuestionRenderer";
import { CategoryData } from "./types/home.types";

const questionnaire: CategoryData[] = [
	{
		title: "Team Collaboration",
		questions: [
			{
				id: "invite-team",
				type: "action-block",
				title: "Invite Your Team",
				description: "Invite your colleagues to help manage compliance tasks.",
				buttonLabel: "Invite Team Members",
				buttonLink: "/:organizationId/settings/members",
			},
		],
	},
	{
		title: "Connect Integrations",
		questions: [
			{
				id: "slack-integration",
				type: "action-block",
				title: "Automate tasks with integrations",
				description:
					"Connect integrations to automate certain tasks, import existing relevant data and invite your employees to complete training.",
				buttonLabel: "Connect Integrations",
				buttonLink: "/:organizationId/integrations",
			},
		],
	},
	{
		title: "Define your Vendors",
		questions: [
			{
				id: "vendor-list",
				type: "action-block",
				title: "Manage your vendors",
				description:
					"Document your third-party relationships to calculate and mitigate potential risks.",
				buttonLabel: "Add Vendors",
				buttonLink: "/:organizationId/vendors",
			},
		],
	},
	{
		title: "Define your Risks",
		questions: [
			{
				id: "risk-list",
				type: "action-block",
				title: "Manage your risks",
				description:
					"Identify and assess potential risks to your organization.",
				buttonLabel: "Add Risks",
				buttonLink: "/:organizationId/risks",
			},
		],
	},
];

export default function Page() {
	return <QuestionRenderer categories={questionnaire} />;
}

/**
 * PRE HOME
 * -----------------------
 *
 * 	    Company Name (string):
 * 	    	Example: "Acme Corporation"
 * 	    Industry Sector (enum/dropdown):
 * 		    Options: Technology, Financial, Healthcare, etc.
 * 	    Company Size (enum/dropdown):
 * 		    Options: "1-10", "11-50", "51-200", "201-500", "501+"
 * 	    Geographical Locations (multi-select):
 * 		    Example: "USA", "UK", "Germany"
 *      Compliance Standards (array):
 *          Example: ["SOC2", "GDPR", "HIPAA", "PCI DSS"]
 *
 *
 */
