import type { TemplateControl as Control } from "../types";

export const securityEventAnalysis: Control = {
	id: "security_event_analysis",
	name: "Security Event Analysis",
	description:
		"The organization implements incident response activities to identify root causes of security incidents and develop remediation plans.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "incident_response_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "incident_analysis_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e851403a5c3114dc746ba",
		},
	],
};
