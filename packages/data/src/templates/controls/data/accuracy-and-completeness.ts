import type { TemplateControl as Control } from "../types";

export const accuracyAndCompleteness: Control = {
	id: "accuracy_and_completeness",
	name: "Accuracy and Completeness",
	description:
		"The entity ensures data is processed accurately and completely.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "data_validation_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85145df1606ef144c69c",
		},
	],
};
