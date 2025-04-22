import type { TemplatePolicy } from "../types";

export const supplierDataProcessingAgreementPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "supplier_data_processing_agreement",
		slug: "supplier-data-processing-agreement",
		name: "Supplier Data Processing Agreement (DPA)",
		description:
			"Template agreement outlining the terms for processing personal data by a supplier (Processor) on behalf of the organization (Controller), ensuring compliance with GDPR Articles 28, 32, and 82.",
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
					text: "Supplier Data Processing Agreement (DPA)",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Agreement Information" }],
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
								{
									type: "text",
									text: "Data Controller (Organization)",
								},
							],
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Data Processor (Supplier)",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Effective Date" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Version" }],
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
							content: [
								{ type: "text", text: "{{supplier_name}}" },
							], // Placeholder for Supplier Name
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }], // Effective date of the DPA
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "1.0" }], // Version number
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Introduction and Scope" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This Data Processing Agreement ('DPA') is entered into between {{organization}} ('Controller') and {{supplier_name}} ('Processor') and supplements any existing service agreement ('Main Agreement') between the parties.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This DPA governs the Processing of Personal Data by the Processor on behalf of the Controller in the course of providing the services specified in the Main Agreement. It ensures compliance with the General Data Protection Regulation (EU) 2016/679 ('GDPR') and other applicable data protection laws.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Definitions" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Terms such as 'Personal Data', 'Processing', 'Data Subject', 'Controller', 'Processor', 'Sub-processor', 'Personal Data Breach', and 'Supervisory Authority' shall have the meanings ascribed to them in GDPR Article 4.",
				},
			],
		},
		// Add specific definitions if needed
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "3. Details of Processing (As required by GDPR Art. 28(3))",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "a. Subject Matter:",
				},
				{
					type: "text",
					text: " The subject matter of the Processing is the provision of [Specify services provided by Supplier, e.g., cloud hosting, CRM services, analytics platform] as defined in the Main Agreement.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "b. Duration:",
				},
				{
					type: "text",
					text: " The Processing will continue for the duration of the Main Agreement, unless terminated earlier in accordance with this DPA.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "c. Nature and Purpose:",
				},
				{
					type: "text",
					text: " The nature and purpose of the Processing are [Describe the processing activities, e.g., storing customer data, processing user activity logs, sending transactional emails] necessary to provide the agreed services to the Controller.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "d. Types of Personal Data:",
				},
				{
					type: "text",
					text: " The types of Personal Data subject to Processing may include [List categories, e.g., contact details (name, email, phone), user credentials, IP addresses, usage data, potentially special categories if applicable - specify clearly]. See Annex 1 for details.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "e. Categories of Data Subjects:",
				},
				{
					type: "text",
					text: " The categories of Data Subjects whose Personal Data may be Processed include [List categories, e.g., Controller's employees, Controller's customers/end-users, website visitors]. See Annex 1 for details.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "4. Processor Obligations (GDPR Art. 28)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "The Processor warrants and agrees to:" },
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
									text: "a. Instructions:",
								},
								{
									type: "text",
									text: " Process Personal Data only on documented instructions from the Controller (including with regard to transfers), unless required to do so by Union or Member State law to which the Processor is subject. In such a case, the Processor shall inform the Controller of that legal requirement before Processing, unless that law prohibits such information on important grounds of public interest.",
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
									text: "b. Confidentiality:",
								},
								{
									type: "text",
									text: " Ensure that persons authorised to Process the Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.",
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
									text: "c. Security (GDPR Art. 32):",
								},
								{
									type: "text",
									text: " Implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of Processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons. These measures shall include, as appropriate: (i) pseudonymisation and encryption of Personal Data; (ii) the ability to ensure the ongoing confidentiality, integrity, availability and resilience of Processing systems and services; (iii) the ability to restore the availability and access to Personal Data in a timely manner in the event of a physical or technical incident; (iv) a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the Processing. Specific measures are detailed in Annex 2.",
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
									text: "d. Sub-processing:",
								},
								{
									type: "text",
									text: " Not engage another processor (Sub-processor) without prior specific or general written authorisation of the Controller. In the case of general written authorisation, the Processor shall inform the Controller of any intended changes concerning the addition or replacement of other processors, thereby giving the Controller the opportunity to object to such changes. Where the Processor engages a Sub-processor, it shall do so only by way of a written contract which imposes on the Sub-processor the same data protection obligations as set out in this DPA. The Processor remains fully liable to the Controller for the performance of the Sub-processor's obligations. A list of approved Sub-processors is in Annex 3.",
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
									text: "e. Data Subject Rights Assistance:",
								},
								{
									type: "text",
									text: " Taking into account the nature of the Processing, assist the Controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the Controller's obligation to respond to requests for exercising the Data Subject's rights laid down in Chapter III of the GDPR.",
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
									text: "f. Controller Assistance:",
								},
								{
									type: "text",
									text: " Assist the Controller in ensuring compliance with the obligations pursuant to GDPR Articles 32 to 36 (Security, Breach Notification, DPIA, Prior Consultation), taking into account the nature of Processing and the information available to the Processor.",
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
									text: "g. Data Return/Deletion:",
								},
								{
									type: "text",
									text: " At the choice of the Controller, delete or return all the Personal Data to the Controller after the end of the provision of services relating to Processing, and delete existing copies unless Union or Member State law requires storage of the Personal Data.",
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
									text: "h. Audits:",
								},
								{
									type: "text",
									text: " Make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Article 28 and allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller. The Processor shall immediately inform the Controller if, in its opinion, an instruction infringes GDPR or other Union or Member State data protection provisions.",
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
			content: [{ type: "text", text: "5. Controller Obligations" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The Controller warrants and agrees that:",
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
									text: "a. Its instructions for the Processing of Personal Data shall comply with applicable data protection laws.",
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
									text: "b. It has established a lawful basis for the Processing activities covered by this DPA.",
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
			content: [{ type: "text", text: "6. Data Transfers" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The Processor shall not transfer Personal Data to any country outside the European Economic Area (EEA) or the UK without the prior written consent of the Controller and unless appropriate safeguards are in place (e.g., adequacy decision, Standard Contractual Clauses (SCCs), Binding Corporate Rules (BCRs)) ensuring an adequate level of data protection as required by GDPR. [Specify agreed transfer mechanism if known, e.g., 'Transfers will be governed by the EU Standard Contractual Clauses, incorporated herein by reference.']",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Personal Data Breaches" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The Processor shall notify the Controller without undue delay, and where feasible within [Specify timeframe, e.g., 48 hours], after becoming aware of a Personal Data Breach affecting the Controller's data. The notification shall include details required by GDPR Article 33(3).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "8. Liability and Indemnity (GDPR Art. 82)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Liability between the parties arising from this DPA shall be governed by the liability provisions of the Main Agreement, subject to the mandatory provisions of GDPR Article 82 concerning liability towards Data Subjects. The Processor shall be liable for the damage caused by Processing only where it has not complied with obligations of GDPR specifically directed to processors or where it has acted outside or contrary to lawful instructions of the Controller. [Parties may wish to include specific indemnity clauses].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Term and Termination" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This DPA commences on the Effective Date and remains in effect until the termination or expiry of the Main Agreement. Termination of the Main Agreement automatically terminates this DPA. Upon termination, the Processor shall comply with the data return or deletion obligations outlined in Section 4(g).",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "10. Governing Law and Jurisdiction" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This DPA shall be governed by [Specify governing law, e.g., the laws of Ireland / the laws of the Member State where the Controller is established]. The parties agree to submit to the exclusive jurisdiction of the courts of [Specify jurisdiction].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "11. Miscellaneous" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This DPA constitutes the entire agreement between the parties with respect to the subject matter hereof. Any modifications must be in writing and signed by both parties. If any provision is held invalid, the remainder remains in effect.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Signatures" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Agreed by the parties through their authorized representatives:",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "For {{organization}} (Controller):" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Signature: ____________________" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Name: [Controller Signatory Name]" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Title: [Controller Signatory Title]" },
			],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Date: {{date}}" }],
		},
		{ type: "paragraph" }, // Spacer
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "For {{supplier_name}} (Processor):" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Signature: ____________________" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Name: [Processor Signatory Name]" },
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Title: [Processor Signatory Title]" },
			],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Date: {{date}}" }],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Annex 1: Details of Processing" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Provide specific details agreed with the Supplier regarding Subject Matter, Duration, Nature/Purpose, Data Types, Data Subject Categories, supplementing Section 3]",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "Annex 2: Technical and Organisational Security Measures",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[Describe the specific TOMs implemented by the Processor, referencing their security documentation or certifications if applicable. Ensure these align with GDPR Art. 32 requirements mentioned in Section 4(c). Examples: Access control, encryption standards, backup procedures, incident response, physical security, etc.]",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "Annex 3: Approved Sub-processors" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "[List all Sub-processors approved by the Controller for use by the Processor, including their location and the purpose of their sub-processing activities, as required by Section 4(d)]",
				},
			],
		},
	],
} as const;
