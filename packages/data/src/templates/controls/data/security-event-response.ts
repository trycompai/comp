import type { TemplateControl as Control } from "../types";

export const securityEventResponse: Control = {
	id: "security_event_response",
	name: "Security Event Response",
	description:
		"The organization designs, develops, and implements policies and procedures to respond to security incidents and breaches.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "incident_response_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "incident_response_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e851403a5c3114dc746ba",
		},
	],
};
