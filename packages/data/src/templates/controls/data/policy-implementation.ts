import type { TemplateControl as Control } from "../types";

export const policyImplementation: Control = {
	id: "policy_implementation",
	name: "Policy Implementation",
	description:
		"The organization selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "policy_implementation_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85140e8b698d7154d43e",
		},
	],
};
