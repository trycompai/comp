import type { TemplateControl } from "../types";

export const privacyNoticeControl: TemplateControl = {
	id: "privacy_notice_control",
	name: "Privacy Notice Review and Availability",
	description:
		"Verify that the public Privacy Notice is up-to-date, accurately describes data processing activities, informs users of their rights (GDPR Art. 12, 13, 14), and is easily accessible.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "privacy_notice",
		},
		{
			type: "evidence",
			evidenceId: "privacy_notice_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A12" },
		{ frameworkId: "gdpr", requirementId: "A13" },
		{ frameworkId: "gdpr", requirementId: "A14" },
	],
};
