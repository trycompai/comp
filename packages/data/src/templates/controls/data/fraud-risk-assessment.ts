import type { TemplateControl as Control } from "../types";

export const fraudRiskAssessment: Control = {
	id: "fraud_risk_assessment",
	name: "Fraud Risk Assessment",
	description:
		"The organization considers the potential for fraud in assessing risks to the achievement of objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "risk_management_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "fraud_risk_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514f62bb35319068677",
		},
	],
};
