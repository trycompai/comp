import type { TemplateControl as Control } from "../types";

export const privacyNotice: Control = {
	id: "privacy_notice",
	name: "Privacy Notice",
	description:
		"The entity provides notice about the collection, use, and disclosure of personal information.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "privacy_policy",
		},
		{
			type: "evidence",
			evidenceId: "privacy_notice_evidence",
		},
	],
	mappedRequirements: [
		{
			frameworkId: "soc2",
			requirementId: "P1",
		},
		{
			frameworkId: "gdpr",
			requirementId: "A12",
		},
	],
};
