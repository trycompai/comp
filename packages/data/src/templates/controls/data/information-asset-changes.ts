import type { TemplateControl as Control } from "../types";

export const informationAssetChanges: Control = {
	id: "information_asset_changes",
	name: "Information Asset Changes",
	description:
		"The organization manages changes to system components to minimize the risk of unauthorized changes.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "change_management_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "change_management_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514753b4054f1a632e7",
		},
	],
};
