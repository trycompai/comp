import type { TemplateControl as Control } from "../types";

export const technologyControls: Control = {
	id: "technology_controls",
	name: "Technology Controls",
	description:
		"The organization selects and develops general control activities over technology to support the achievement of objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "technology_control_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85140e8b698d7154d43e",
		},
	],
};
