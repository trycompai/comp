import type { TemplateControl as Control } from "../types";

export const managementPhilosophy: Control = {
	id: "management_philosophy",
	name: "Management Philosophy",
	description:
		"Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "corporate_governance_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "management_structure_documentation",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514778fd2238a33c121",
		},
	],
};
