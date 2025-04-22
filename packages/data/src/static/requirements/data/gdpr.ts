import { SingleFrameworkRequirements } from "../types";
import { gdprRequirementIds } from "./gdpr.types";

export const gdprRequirements: SingleFrameworkRequirements<gdprRequirementIds> =
	{
		A4: {
			name: "Article 4: Data protection by design and by default",
			description:
				"Requires controllers to implement data protection principles from the outset of designing processing activities and to ensure data minimization by default.",
		},
		A5: {
			name: "Article 5: Principles relating to processing of personal data",
			description:
				"Ensures personal data is processed lawfully, fairly, transparently, for specific purposes, is minimized, accurate, stored for limited time, and secured.",
		},
		A6: {
			name: "Article 6: Lawfulness of processing",
			description:
				"Defines the legal grounds for processing personal data, including consent, contract necessity, legal obligation, vital interests, public task, and legitimate interests.",
		},
		A7: {
			name: "Article 7: Conditions for consent",
			description:
				"Specifies requirements for valid consent, ensuring it is freely given, specific, informed, unambiguous, and easily withdrawable.",
		},
		A12: {
			name: "Article 12: Transparent communication",
			description:
				"Requires controllers to provide information to data subjects in a concise, transparent, intelligible, and easily accessible form using clear and plain language.",
		},
		A13: {
			name: "Article 13: Information collected from data subject",
			description:
				"Mandates providing specific information to data subjects when their personal data is collected directly from them.",
		},
		A14: {
			name: "Article 14: Information not obtained from data subject",
			description:
				"Mandates providing specific information to data subjects when their personal data is obtained from other sources.",
		},
		A15: {
			name: "Article 15: Right of access",
			description:
				"Grants data subjects the right to access their personal data and receive information about how it is processed.",
		},
		A16: {
			name: "Article 16: Right to rectification",
			description:
				"Allows data subjects to request the correction of inaccurate personal data concerning them.",
		},
		A17: {
			name: "Article 17: Right to erasure ('right to be forgotten')",
			description:
				"Entitles data subjects to request the deletion of their personal data under specific circumstances.",
		},
		A18: {
			name: "Article 18: Right to restriction of processing",
			description:
				"Gives data subjects the right to request the limitation of processing of their personal data under certain conditions.",
		},
		A19: {
			name: "Article 19: Right to notification of erasure",
			description:
				"Requires controllers to notify the data subject when their personal data has been deleted.",
		},
		A20: {
			name: "Article 20: Right to data portability",
			description:
				"Allows data subjects to receive their personal data in a structured, commonly used, machine-readable format and transmit it to another controller.",
		},
		A21: {
			name: "Article 21: Right to object",
			description:
				"Grants data subjects the right to object to the processing of their personal data, including for direct marketing purposes.",
		},
		A25: {
			name: "Article 25: Data protection by design and by default",
			description:
				"Requires controllers to implement data protection principles from the outset of designing processing activities and to ensure data minimization by default.",
		},
		A30: {
			name: "Article 30: Records of processing activities",
			description:
				"Obliges controllers and processors to maintain detailed records of their data processing activities.",
		},
		A32: {
			name: "Article 32: Security of processing",
			description:
				"Mandates controllers and processors to implement appropriate technical and organizational measures to ensure data security.",
		},
		A33: {
			name: "Article 33: Breach notification to supervisory authority",
			description:
				"Requires controllers to notify the relevant supervisory authority of a personal data breach within 72 hours.",
		},
		A34: {
			name: "Article 34: Breach communication to data subject",
			description:
				"Requires controllers to communicate a personal data breach to the affected data subjects without undue delay if it poses a high risk.",
		},
		A35: {
			name: "Article 35: Data Protection Impact Assessment (DPIA)",
			description:
				"Mandates conducting a DPIA for processing activities likely to result in a high risk to individuals' rights and freedoms.",
		},
	} as const;
