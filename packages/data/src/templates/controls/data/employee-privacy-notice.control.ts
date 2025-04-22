import type { TemplateControl } from "../types";

export const employeePrivacyNoticeControl: TemplateControl = {
	id: "employee_privacy_notice_control",
	name: "Employee Privacy Notice Provision and Accuracy",
	description:
		"Verify that the Employee Privacy Notice is provided to all staff and accurately reflects the collection, use, and protection of employee personal data as required by GDPR Articles 12, 13, and 14.",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "employee_privacy_notice",
		},
		{
			type: "evidence",
			evidenceId: "employee_privacy_notice_evidence",
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A12" },
		{ frameworkId: "gdpr", requirementId: "A13" },
		{ frameworkId: "gdpr", requirementId: "A14" },
	],
};
