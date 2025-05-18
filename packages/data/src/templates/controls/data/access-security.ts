import type { TemplateControl as Control } from "../types";

export const accessSecurity: Control = {
	id: "access_security",
	name: "Access Security",
	description:
		"The organization implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "access_control_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
