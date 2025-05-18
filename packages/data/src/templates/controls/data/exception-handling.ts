import type { TemplateControl as Control } from "../types";

export const exceptionHandling: Control = {
	id: "exception_handling",
	name: "Exception Handling",
	description:
		"The entity identifies and resolves processing exceptions in a timely manner.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "exception_logs",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85145df1606ef144c69c",
		},
	],
};
