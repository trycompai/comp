import type { TemplateControl as Control } from "../types";

export const riskIdentification: Control = {
	id: "risk_identification",
	name: "Risk Identification",
	description:
		"The organization identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "risk_management_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "risk_identification_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514f62bb35319068677",
		},
	],
};
