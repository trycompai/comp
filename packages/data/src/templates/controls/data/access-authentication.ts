import type { TemplateControl as Control } from "../types";

export const accessAuthentication: Control = {
	id: "access_authentication",
	name: "Access Authentication",
	description:
		"Prior to issuing system credentials and granting system access, the organization registers and authorizes new internal and external users.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "authentication_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
