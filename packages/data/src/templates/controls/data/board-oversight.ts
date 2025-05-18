import type { TemplateControl as Control } from "../types";

export const boardOversight: Control = {
	id: "board_oversight",
	name: "Board Oversight",
	description:
		"The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "board_meeting_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514b7a9c5278ada8527",
		},
	],
};
