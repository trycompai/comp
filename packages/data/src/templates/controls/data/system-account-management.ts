import type { TemplateControl as Control } from "../types";

export const systemAccountManagement: Control = {
	id: "system_account_management",
	name: "System Account Management",
	description:
		"The organization identifies and authenticates system users, devices, and other systems before allowing access.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "access_control_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "account_management_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
