import type { TemplateControl as Control } from "../types";

export const informationQuality: Control = {
	id: "information_quality",
	name: "Information Quality",
	description:
		"The organization obtains or generates and uses relevant, quality information to support the functioning of internal control.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "information_security_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "data_quality_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e85140854c64019d53422",
		},
	],
};
