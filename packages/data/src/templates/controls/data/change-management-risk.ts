import type { TemplateControl as Control } from "../types";

export const changeManagementRisk: Control = {
	id: "change_management_risk",
	name: "Change Management Risk",
	description:
		"The organization identifies and assesses changes that could significantly impact the system of internal control.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "change_management_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "change_risk_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514f62bb35319068677",
		},
	],
};
