import type { TemplatePolicy } from "../types";

export const recordsOfProcessingActivitiesPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "records_of_processing_activities",
		slug: "records-of-processing-activities-ropa",
		name: "Records of Processing Activities (RoPA) Template",
		description:
			"Template for documenting processing activities as required by Article 30 of the GDPR. This applies to both Controllers and Processors (with specific sections for each).",
		frequency: "yearly", // RoPA should be kept up-to-date, reviewed periodically
		department: "admin", // Often managed by DPO/Compliance/Legal
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Records of Processing Activities (RoPA) - GDPR Article 30",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Part 1: Controller Records (GDPR Article 30(1))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Each controller (or controller's representative) shall maintain a record of processing activities under its responsibility. That record shall contain all of the following information:",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "a) Name and Contact Details",
				},
			],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Controller Name" },
							],
						},
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "{{organization}}" },
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Controller Representative (if applicable)",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "[Name/Contact]" }],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Joint Controller(s) (if applicable)",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "[Name/Contact]" }],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Data Protection Officer (DPO)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Name/Contact Details]",
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
					text: "b) Purposes of the Processing",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[List and describe the specific purposes for which personal data is processed, e.g., Customer relationship management, Employee administration, Marketing communications, Service provision, Security monitoring, Analytics]. Link to specific processing activities documented below.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "c) Description of Categories of Data Subjects and Personal Data",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[For each processing purpose/activity, describe the categories of individuals whose data is processed (e.g., Customers, Employees, Website Visitors, Suppliers) and the categories of personal data processed (e.g., Contact details, Financial data, Usage data, Health information - specify if special categories). Detailed mapping often done per activity below].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "d) Categories of Recipients",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[List the categories of recipients to whom the personal data have been or will be disclosed (e.g., Internal departments (HR, IT), Payment processors, Cloud hosting providers, Marketing automation platforms, Auditors, Legal advisors, Government authorities)].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "e) Transfers of Personal Data to Third Countries or International Organisations",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Where applicable, identify the third countries or international organisations to which data is transferred and document the safeguards in place (e.g., Adequacy decision, Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs), Derogations under Art. 49)].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "f) Envisaged Time Limits for Erasure (Retention Periods)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Where possible, provide the planned retention periods for the different categories of data. Link to or reference the Data Retention Schedule/Policy].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "g) General Description of Technical and Organisational Security Measures (Art. 32(1))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Where possible, provide a general description of the security measures implemented (e.g., Pseudonymisation, Encryption, Access controls, Confidentiality measures, Integrity checks, Availability/resilience measures, Backup/recovery processes, Regular security testing). Reference relevant security policies/documentation].",
				},
			],
		},
		// Detailed Processing Activities Section (Optional but recommended structure)
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Detailed Processing Activities (Controller)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "(Repeat this section for each distinct processing activity)",
				},
			],
		},
		{
			type: "table",
			content: [
				{
					type: "tableRow",
					content: [
						{
							type: "tableHeader",
							attrs: { colspan: 2 },
							content: [
								{
									type: "text",
									text: "Processing Activity ID & Name",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Activity Description & Department",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Managing customer subscriptions - Sales/Finance]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "Purpose(s)" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Specific purpose for this activity, e.g., Process payments, provide access, communicate service updates]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Lawful Basis (Art. 6)" },
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Contractual Necessity (6(1)(b)), Legal Obligation (6(1)(c)), Legitimate Interest (6(1)(f) - specify interest), Consent (6(1)(a))]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Categories of Data Subjects",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Paying Customers]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Categories of Personal Data",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Name, Email, Company, Billing Address, Payment Info (last 4 digits), Subscription plan]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Special Category Data (Art. 9)? Lawful Basis?",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Yes/No. If Yes, specify basis]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [{ type: "text", text: "Recipients" }],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Internal: Sales, Finance. External: Payment Processor [Name], Cloud Provider [Name]]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Third Country Transfers? Safeguards?",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Yes/No. If Yes, specify country/org and safeguard, e.g., USA (Payment Processor) - SCCs]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{ type: "text", text: "Retention Period" },
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[e.g., Duration of contract + 7 years (financial records)]",
								},
							],
						},
					],
				},
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Security Measures (General Ref)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "[Refer to general measures in g) or specific policy, e.g., Encryption at rest/transit, Access controls based on role]",
								},
							],
						},
					],
				},
			],
		},
		// Part 2: Processor Records
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Part 2: Processor Records (GDPR Article 30(2))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "(Applicable if {{organization}} acts as a data processor for other controllers). Each processor (or processor's representative) shall maintain a record of all categories of processing activities carried out on behalf of a controller, containing:",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "a) Name and Contact Details",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Processor Name/Contact: {{organization}} [Contact Details]",
				},
				{ type: "hardBreak" },
				{
					type: "text",
					text: "Processor Representative (if applicable): [Name/Contact]",
				},
				{ type: "hardBreak" },
				{
					type: "text",
					text: "Controller Name/Contact (for each controller): [List Controller(s) Name/Contact]",
				},
				{ type: "hardBreak" },
				{
					type: "text",
					text: "Controller Representative (if applicable): [Name/Contact]",
				},
				{ type: "hardBreak" },
				{
					type: "text",
					text: "DPO Name/Contact (Processor & Controller): [Details]",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "b) Categories of Processing carried out on behalf of each Controller",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Describe the categories of processing, e.g., Data hosting, Application support, Email delivery]",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "c) Transfers of Personal Data to Third Countries or International Organisations",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Where applicable, identify third countries/organisations and document safeguards (authorised by the Controller)]",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "d) General Description of Technical and Organisational Security Measures (Art. 32(1))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Provide a general description of security measures implemented. Reference relevant policies/documentation].",
				},
			],
		},
		// Maintenance and Review
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Part 3: Maintenance and Review",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The records must be in writing, including in electronic form.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This RoPA must be kept up-to-date and reflect current processing activities. It shall be reviewed at least annually by the [DPO/Compliance Team] and updated whenever significant changes to processing occur.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The controller or the processor and, where applicable, the controller's or the processor's representative, shall make the record available to the supervisory authority on request.",
				},
			],
		},
	],
} as const;
