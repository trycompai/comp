import type { TemplateControl as Control } from "../types";

export const choiceAndConsent: Control = {
	id: "choice_and_consent",
	name: "Choice and Consent",
	description:
		"The entity obtains consent for personal information where required by policy or law.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "privacy_policy",
		},
	],
	mappedTasks: [
		{
			taskId: "consent_records",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "frk_682734f304cbbfdb3a9d4f44",
			requirementId: "frk_rq_681e8514e2ebc08069c2c862",
		},
	],
};
