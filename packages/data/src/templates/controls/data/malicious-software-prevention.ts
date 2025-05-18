import type { TemplateControl as Control } from "../types";

export const maliciousSoftwarePrevention: Control = {
	id: "malicious_software_prevention",
	name: "Malicious Software Prevention",
	description:
		"The organization implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "malware_prevention_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
