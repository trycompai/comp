import type { TemplateEvidence } from "../types";

export const rightToErasureEvidence: TemplateEvidence = {
	id: "right_to_erasure_evidence",
	name: "Right to Erasure Procedure Evidence",
	description:
		"Provide records from the Data Subject Request Log demonstrating how erasure requests (GDPR Art. 17) were handled, including verification, assessment of grounds/exceptions, confirmation of data deletion/anonymization from relevant systems (including backups where applicable), notification to recipients (if applicable), and communication with data subjects (confirming erasure or explaining refusal/exceptions).",
	frequency: "yearly", // Or 'ongoing' / 'per_request'
	department: "admin", // Or 'legal' / 'privacy'
};
