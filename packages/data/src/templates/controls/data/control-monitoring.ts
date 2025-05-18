import type { TemplateControl as Control } from "../types";

export const controlMonitoring: Control = {
	id: "control_monitoring",
	name: "Control Monitoring",
	description:
		"The organization selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "control_testing_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514cba3ce1991f9d6c8",
		},
	],
};
