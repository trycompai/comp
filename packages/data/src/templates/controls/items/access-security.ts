import type { Control } from "../types";

export const accessSecurity: Control = {
	id: "access_security",
	name: "Access Security",
	description:
		"The organization implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control",
		},
		{
			type: "evidence",
			evidenceId: "access_control_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "soc2",
			requirementId: "CC6",
		},
	],
};
