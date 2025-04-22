import type { TemplateControl } from "../types";

export const dataSubjectConsentFormControl: TemplateControl = {
	id: "data_subject_consent_form_control",
	name: "Consent Form Usage and Record Keeping",
	description:
		"Verify that the Data Subject Consent Form is used correctly to obtain explicit, informed consent (GDPR Art. 6, 7, 9) for specific processing activities and that records of consent are maintained.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "data_subject_consent_form",
		},
		{
			type: "evidence",
			evidenceId: "data_subject_consent_form_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A6" },
		{ frameworkId: "gdpr", requirementId: "A7" },
	],
};
