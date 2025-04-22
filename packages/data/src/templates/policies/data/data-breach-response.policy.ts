import type { TemplatePolicy } from "../types";

export const dataBreachResponsePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "data_breach_response",
		slug: "data-breach-response-procedure",
		name: "Data Breach Response and Notification Procedure",
		description:
			"This procedure outlines the steps for identifying, assessing, containing, mitigating, notifying relevant parties about, and reviewing personal data breaches in accordance with GDPR Articles 4, 33, and 34.",
		frequency: "yearly",
		department: "it",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Data Breach Response and Notification Procedure",
				},
			],
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
							type: "tableHeader",
							content: [{ type: "text", text: "Organization" }],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Last Review" }],
						},
						{
							type: "tableHeader",
							content: [
								{ type: "text", text: "Review Frequency" },
							],
						},
						{
							type: "tableHeader",
							content: [{ type: "text", text: "Approved By" }],
						},
						{
							type: "tableHeader",
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
									text: "[DPO/CISO/Relevant Authority]",
								},
							], // Placeholder for approval role
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Confidential" }],
						},
					],
				},
			],
		},
		// Introduction Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Introduction and Purpose" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This procedure details the actions to be taken by {{organization}} in the event of a personal data breach. Its purpose is to ensure a timely and effective response to mitigate potential harm to data subjects and to comply with legal obligations under the General Data Protection Regulation (GDPR), specifically Articles 4, 33, and 34.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This procedure applies to all employees, contractors, and third-party service providers of {{organization}} who process personal data on behalf of the company. It covers breaches affecting personal data for which {{organization}} is the data controller or data processor.",
				},
			],
		},
		// Definitions Section (Based on GDPR Art 4)
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "3. Definitions" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Personal Data Breach (GDPR Art 4(12)):",
				},
				{
					type: "text",
					text: " A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data transmitted, stored or otherwise processed. This includes incidents affecting the confidentiality, integrity, or availability of personal data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Personal Data (GDPR Art 4(1)):",
				},
				{
					type: "text",
					text: ' Any information relating to an identified or identifiable natural person ("data subject").',
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Supervisory Authority:",
				},
				{
					type: "text",
					text: " The independent public authority responsible for monitoring the application of the GDPR (e.g., the ICO in the UK, CNIL in France).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Protection Officer (DPO):",
				},
				{
					type: "text",
					text: " The individual designated (if applicable) to oversee data protection strategy and implementation.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Incident Response Team (IRT):",
				},
				{
					type: "text",
					text: " A designated group responsible for managing the response to security incidents, including data breaches.",
				},
			],
		},
		// Procedure Steps Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "4. Data Breach Response Procedure" },
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "4.1. Identification and Reporting" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Any employee or contractor who discovers or suspects a personal data breach must immediately report it to [Specify reporting channel, e.g., the IT Helpdesk, Security Team, or DPO] using [Specify method, e.g., dedicated email, reporting form, phone number].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Initial reports should include as much detail as possible, such as: date/time of discovery, nature of the suspected breach, types of data potentially involved, systems affected, and any initial actions taken.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.2. Assessment and Triage" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Upon receiving a report, the [IRT/Designated Role] will conduct a preliminary assessment to:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "Confirm whether a personal data breach has occurred.",
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
									text: "Determine the nature and scope of the breach (e.g., type of data, number of individuals affected, systems involved).",
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
									text: "Assess the immediate risk.",
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
									text: "Activate the full Incident Response Team (IRT) if necessary.",
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
			content: [{ type: "text", text: "4.3. Containment and Recovery" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The IRT will take immediate steps to contain the breach and limit its impact. Actions may include:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "Isolating affected systems.",
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
									text: "Revoking compromised credentials.",
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
									text: "Securing physical areas.",
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
									text: "Preventing further unauthorized access or disclosure.",
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
									text: "Initiating recovery procedures (e.g., restoring data from backups).",
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
			content: [{ type: "text", text: "4.4. Risk Assessment" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The IRT, in consultation with the DPO (if applicable) and legal counsel, will assess the risks posed by the breach to the rights and freedoms of data subjects. This assessment considers:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "The type and sensitivity of the personal data involved.",
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
									text: "The likelihood and severity of potential harm (e.g., identity theft, financial loss, reputational damage, discrimination).",
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
									text: "The number of individuals affected.",
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
									text: "The nature of the recipients if data was disclosed.",
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
									text: "Any mitigation measures taken.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This risk assessment determines the notification obligations under GDPR Articles 33 and 34.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.5. Notification to Supervisory Authority (GDPR Art 33)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Timing:",
				},
				{
					type: "text",
					text: " If the breach is likely to result in a risk to the rights and freedoms of natural persons, {{organization}} must notify the relevant Supervisory Authority without undue delay, and where feasible, not later than 72 hours after having become aware of it. If notification is delayed beyond 72 hours, reasons for the delay must be provided.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Threshold:",
				},
				{
					type: "text",
					text: " Notification is NOT required if the breach is unlikely to result in a risk to the rights and freedoms of natural persons (determined during the Risk Assessment). The justification for not notifying must be documented.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Content:",
				},
				{
					type: "text",
					text: " The notification must, at a minimum:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "Describe the nature of the personal data breach including, where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned.",
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
									text: "Communicate the name and contact details of the DPO or other contact point where more information can be obtained.",
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
									text: "Describe the likely consequences of the personal data breach.",
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
									text: "Describe the measures taken or proposed to be taken by the controller to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If all information is not available at once, it can be provided in phases without undue further delay.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [DPO/Legal/Designated Role] is responsible for making the notification.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{
					type: "text",
					text: "4.6. Communication to Data Subjects (GDPR Art 34)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Timing:",
				},
				{
					type: "text",
					text: " If the breach is likely to result in a HIGH risk to the rights and freedoms of natural persons, {{organization}} must communicate the breach to the affected data subjects without undue delay.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Threshold:",
				},
				{
					type: "text",
					text: " Communication is required when the risk assessment indicates a high risk. This threshold is higher than for notification to the Supervisory Authority.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Content:",
				},
				{
					type: "text",
					text: " The communication must be in clear and plain language and describe:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "The nature of the personal data breach.",
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
									text: "The name and contact details of the DPO or other contact point.",
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
									text: "The likely consequences of the breach.",
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
									text: "The measures taken or proposed to address the breach and mitigate adverse effects.",
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
									text: "Recommendations for individuals to protect themselves (e.g., change passwords).",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Exceptions:",
				},
				{
					type: "text",
					text: " Communication to data subjects is NOT required if:",
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
									text: "Appropriate technical and organizational protection measures were implemented (e.g., encryption making the data unintelligible).",
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
									text: "Subsequent measures have been taken which ensure that the high risk is no longer likely to materialize.",
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
									text: "It would involve disproportionate effort (in which case, a public communication or similar measure must be made instead).",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [DPO/Legal/Marketing/Designated Role] is responsible for drafting and coordinating the communication.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.7. Post-Incident Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "After the breach has been contained and resolved, the IRT will conduct a post-incident review to:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "Analyze the cause(s) of the breach.",
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
									text: "Evaluate the effectiveness of the response.",
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
									text: "Identify lessons learned.",
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
									text: "Recommend improvements to security controls, policies, and procedures to prevent recurrence.",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Findings and recommendations will be documented and reported to senior management.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.8. Record Keeping" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} will maintain an internal register of all personal data breaches, regardless of whether notification was required. This register must document:",
				},
			],
		},
		{
			type: "bulletList",
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
									text: "The facts relating to the breach.",
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
									text: "Its effects.",
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
									text: "The remedial action taken.",
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
									text: "Justification for decisions made (e.g., not notifying the SA or data subjects).",
								},
							],
						},
					],
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This documentation enables the Supervisory Authority to verify compliance.",
				},
			],
		},
		// Roles and Responsibilities Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Roles and Responsibilities" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "All Employees/Contractors:",
				},
				{ type: "text", text: " Report suspected breaches promptly." },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Incident Response Team/Designated Role]:",
				},
				{
					type: "text",
					text: " Lead assessment, containment, recovery, risk assessment, and post-incident review.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Protection Officer (DPO) / Legal Counsel:",
				},
				{
					type: "text",
					text: " Provide guidance on legal obligations, risk assessment, and oversee notifications.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Relevant Department Heads]:",
				},
				{
					type: "text",
					text: " Cooperate with the IRT and implement corrective actions.",
				},
			],
		},
		// Policy Review Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "6. Policy Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This procedure will be reviewed at least annually and updated as necessary to reflect changes in regulations, technology, or business processes.",
				},
			],
		},
	],
} as const;
