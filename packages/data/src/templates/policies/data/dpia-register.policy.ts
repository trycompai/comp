import type { TemplatePolicy } from "../types";

export const dpiaRegisterPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "dpia_register",
		slug: "dpia-register",
		name: "Data Protection Impact Assessment (DPIA) Register",
		description:
			"Register to document Data Protection Impact Assessments (DPIAs) conducted in accordance with GDPR Article 35, particularly for processing likely to result in a high risk to the rights and freedoms of natural persons.",
		frequency: "yearly",
		department: "admin",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Data Protection Impact Assessment (DPIA) Register",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "In accordance with Article 35 of the General Data Protection Regulation (GDPR), this register documents Data Protection Impact Assessments (DPIAs). A DPIA is required for processing operations that are likely to result in a high risk to the rights and freedoms of natural persons, particularly those involving new technologies, or considering the nature, scope, context, and purposes of the processing. This register provides a systematic description of the envisaged processing operations, an assessment of the necessity and proportionality, an assessment of the risks to data subjects, and the measures envisaged to address these risks.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "DPIA Register Entries" }],
		},
		{
			type: "table",
			content: [
				// Header Row
				{
					type: "tableRow",
					content: [
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "ID" }],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Processing Activity Description",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Date of Assessment",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Data Controller / Department",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Purpose(s) of Processing",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Categories of Personal Data",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Categories of Data Subjects",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Data Recipients",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Necessity & Proportionality Assessment",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Risk Identification & Assessment",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Measures to Address Risks",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{ type: "text", text: "Consultation" },
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Approval (DPO/Lead) & Date",
										},
									],
								},
							],
						},
						{
							type: "tableHeader",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Next Review Date",
										},
									],
								},
							],
						},
					],
				},
				// Example/Placeholder Row (Users should add new rows below this)
				{
					type: "tableRow",
					content: [
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[DPIA-YYYY-NN]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Systematic description of the processing operation, e.g., Implementation of new AI-powered customer support tool]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{ type: "text", text: "{{date}}" },
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[e.g., {{organization}} / Customer Success Dept.]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Specific purposes, e.g., Improve response times, automate query resolution, analyze support trends]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[e.g., User contact info, support ticket content, usage metadata, potentially special category data if applicable]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[e.g., Customers, support agents]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Internal teams, third-party tool provider (Sub-processor), auditors]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Assessment summary: Is processing necessary for the purpose? Are the means proportionate? Alternatives considered?]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Identify risks to data subjects (e.g., unauthorized access, inaccurate profiling, lack of transparency). Assess likelihood and impact.]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Technical (e.g., encryption, access controls) and Organisational (e.g., policies, training, DPA with vendor) measures planned or in place.]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Record of consultation with DPO, data subjects (if applicable), Supervisory Authority (if required under Art. 36)]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Name/Title & {{date}}]",
										},
									],
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "[Date or condition for review, e.g., Annually, or upon significant change]",
										},
									],
								},
							],
						},
					],
				},
				// Add more rows here for each DPIA conducted
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Guidance on Completing the DPIA Register",
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
									text: "ID:",
								},
								{
									type: "text",
									text: " Assign a unique identifier for tracking (e.g., DPIA-YYYY-NN).",
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
									text: "Processing Activity:",
								},
								{
									type: "text",
									text: " Clearly describe the project, system, or process involving personal data.",
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
									text: "Necessity & Proportionality:",
								},
								{
									type: "text",
									text: " Justify why the processing is required and proportionate to achieve the stated purposes.",
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
									text: "Risk Identification:",
								},
								{
									type: "text",
									text: " Consider potential impacts on data subjects' rights (confidentiality, integrity, availability, non-discrimination, etc.). Evaluate likelihood and severity.",
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
									text: "Measures:",
								},
								{
									type: "text",
									text: " Detail specific controls (technical and organizational) to mitigate identified risks.",
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
									text: "Consultation:",
								},
								{
									type: "text",
									text: " Document who was consulted (DPO is mandatory). If risks remain high after mitigation, consultation with the Supervisory Authority may be required (Art. 36).",
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
									text: "Review:",
								},
								{
									type: "text",
									text: " DPIAs should be reviewed periodically, especially if the processing context or risks change.",
								},
							],
						},
					],
				},
			],
		},
	],
} as const;
