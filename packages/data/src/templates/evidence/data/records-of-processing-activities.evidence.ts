import type { TemplateEvidence } from "../types";

export const recordsOfProcessingActivitiesEvidence: TemplateEvidence = {
	id: "ropa_evidence", // Shortened ID for consistency
	name: "Records of Processing Activities (RoPA) Evidence",
	description:
		"Provide the current version of the Records of Processing Activities (RoPA) document maintained according to GDPR Article 30. Include evidence of regular review and updates (e.g., version history, review meeting minutes, change logs).",
	frequency: "yearly", // Evidence of review is yearly, the RoPA itself is ongoing
	department: "admin", // Or 'legal' / 'privacy' / DPO
};
