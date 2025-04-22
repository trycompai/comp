import type { TemplateControl } from "../types";

export const recordsOfProcessingActivitiesControl: TemplateControl = {
	id: "ropa_control", // Shortened ID for consistency
	name: "Records of Processing Activities (RoPA) Maintenance Review",
	description:
		"Verify that the Records of Processing Activities (RoPA) are maintained, accurate, complete, and regularly reviewed/updated as required by GDPR Article 30. This includes confirming the presence of all mandatory information for both controller and processor activities (where applicable).",
	mappedArtifacts: [
		{
			type: "policy",
			policyId: "records_of_processing_activities_policy",
		},
		{
			type: "evidence",
			evidenceId: "records_of_processing_activities_evidence", // Link to the evidence (the RoPA document and review logs)
		},
	],
	mappedRequirements: [
		{ frameworkId: "gdpr", requirementId: "A30" }, // Maps to GDPR Article 30
	],
};
