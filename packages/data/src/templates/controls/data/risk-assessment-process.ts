import type { TemplateControl as Control } from "../types";

export const riskAssessmentProcess: Control = {
	id: "risk_assessment_process",
	name: "Risk Assessment Process",
	description:
		"The organization specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "risk_management_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "risk_assessment_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514f62bb35319068677",
		},
	],
};
