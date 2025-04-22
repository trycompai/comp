import type { TemplatePolicy } from "../types";

export const dataProtectionPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_protection",
		slug: "data-protection-policy",
		name: "Data Protection Policy",
		description:
			"This policy outlines the technical and organizational measures implemented to ensure and demonstrate compliance with the General Data Protection Regulation (GDPR), specifically Article 24.",
		frequency: "yearly",
		department: "admin",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Data Protection Policy" }],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Policy Information" }],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "Organization" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Last Review" }],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Review Frequency" },
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Approved By" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Classification" }],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "{{organization}}" },
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Annual" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Data Protection Officer / Legal",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Confidential" }],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Revision History" }],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "Version" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Date" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Description" }],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "1.0" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Initial version" },
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Purpose and Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy is to establish the framework for ensuring and demonstrating compliance with the General Data Protection Regulation (GDPR), particularly Article 24 ('Responsibility of the controller'). It outlines the technical and organizational measures {{organization}} implements to protect personal data processed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This policy applies to all processing of personal data conducted by {{organization}}, including data related to customers, employees, partners, and other individuals whose data we process. It applies to all employees, contractors, and third-party service providers acting on behalf of {{organization}}.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Background" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "GDPR Article 24 requires data controllers like {{organization}} to implement appropriate technical and organizational measures to ensure and be able to demonstrate that processing is performed in accordance with the regulation. These measures must consider the nature, scope, context, and purposes of processing, as well as the risks to the rights and freedoms of individuals. This policy details these measures.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Policy" }],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "Technical and Organizational Measures" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall implement and maintain appropriate technical and organizational measures, including but not limited to:",
				},
			],
		},
		{
			type: "orderedList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Minimization:",
								},
								{
									type: "text",
									text: " Collecting and processing only the personal data necessary for specified, explicit, and legitimate purposes.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Access Control:",
								},
								{
									type: "text",
									text: " Implementing role-based access controls and the principle of least privilege to limit data access to authorized personnel (Ref: Access Control Policy).",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Encryption and Pseudonymization:",
								},
								{
									type: "text",
									text: " Utilizing encryption for data at rest and in transit, and pseudonymization where appropriate, to protect data confidentiality.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Security:",
								},
								{
									type: "text",
									text: " Maintaining robust security measures, including regular vulnerability scanning, penetration testing, and security monitoring (Ref: Information Security Policy, Application Security Policy).",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Integrity and Availability:",
								},
								{
									type: "text",
									text: " Ensuring data accuracy and implementing backup and disaster recovery procedures (Ref: Availability Policy, Business Continuity Policy, Disaster Recovery Policy).",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Regular Review:",
								},
								{
									type: "text",
									text: " Regularly testing, assessing, and evaluating the effectiveness of technical and organizational measures.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "Data Protection by Design and by Default",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall integrate data protection principles into all stages of processing activities, from design to implementation and operation. This includes:",
				},
			],
		},
		{
			type: "orderedList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Conducting Data Protection Impact Assessments (DPIAs) for processing activities likely to result in a high risk to individuals' rights and freedoms.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Implementing measures to ensure that, by default, only personal data necessary for each specific purpose are processed.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Considering data protection implications during the development or procurement of new systems or services (Ref: Software Development Policy, Vendor Risk Management Policy).",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "Demonstrating Compliance" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall maintain records and documentation to demonstrate compliance, including:",
				},
			],
		},
		{
			type: "orderedList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Records of Processing Activities (ROPA) as required by GDPR Article 30.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Documentation of implemented technical and organizational measures.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Results of DPIAs, audits, and assessments.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Data Processing Agreements (DPAs) with third-party processors.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Records of data breaches and notifications (Ref: Incident Response Policy).",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Records of staff training on data protection.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "Data Subject Rights" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall establish procedures to facilitate the exercise of data subject rights (access, rectification, erasure, restriction, portability, objection) as outlined in the GDPR and the Privacy Policy.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "Training and Awareness" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All personnel with access to personal data shall receive regular training on data protection principles, policies, and procedures.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Responsibilities" }],
		},
		{
			type: "orderedList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Data Protection Officer (DPO) / Legal Department:",
								},
								{
									type: "text",
									text: " Oversees the implementation and maintenance of this policy, provides guidance, monitors compliance, and acts as the contact point for supervisory authorities.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "Management:",
								},
								{
									type: "text",
									text: " Ensures adequate resources are allocated for data protection and promotes a culture of data privacy.",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "All Employees and Contractors:",
								},
								{
									type: "text",
									text: " Adhere to this policy and associated data protection procedures in their daily work.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "References" }],
		},
		{
			type: "orderedList",
			attrs: { tight: true },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "General Data Protection Regulation (GDPR), Article 24",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{ type: "text", text: "Access Control Policy" },
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Information Security Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Application Security Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{ type: "text", text: "Availability Policy" },
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Business Continuity Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Disaster Recovery Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Incident Response Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: "Privacy Policy" }],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Software Development Policy",
								},
							],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Vendor Risk Management Policy",
								},
							],
						},
					],
				},
			],
		},
	],
} as const;
