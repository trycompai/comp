import type { TemplatePolicy } from "../types";

export const rightToErasurePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_to_erasure",
		slug: "right-to-erasure-policy",
		name: "Right to Erasure ('Right to be Forgotten') Policy and Procedure",
		description:
			"Outlines the procedure for handling requests from data subjects to erase their personal data, in compliance with GDPR Article 17.",
		frequency: "yearly",
		department: "admin", // Or 'legal' / 'privacy' depending on company structure
	},
	content: [
		// Heading 1
		{
			type: "heading",
			attrs: { level: 1 },
			content: [
				{
					type: "text",
					text: "Right to Erasure ('Right to be Forgotten') Policy and Procedure",
				},
			],
		},
		// Policy Information Table
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
									text: "[DPO/Compliance Lead/Relevant Authority]",
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Internal" }],
						},
					],
				},
			],
		},
		// 1. Introduction and Purpose
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
					text: "Article 17 of the General Data Protection Regulation (GDPR) grants data subjects the 'right to be forgotten'. This means individuals have the right to obtain the erasure of personal data concerning them from the controller without undue delay, under specific circumstances.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for erasure in a compliant, secure, and efficient manner, respecting the rights of data subjects while recognizing applicable exceptions.",
				},
			],
		},
		// 2. Scope
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
					text: "This procedure applies to all personal data processed by {{organization}} as a data controller and covers all employees, contractors, and relevant third parties involved in handling data subject requests or managing systems containing personal data.",
				},
			],
		},
		// 3. Definitions
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
					text: "Processing (GDPR Art 4(2)):",
				},
				{
					type: "text",
					text: " Any operation performed on personal data, such as collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Controller (GDPR Art 4(7)):",
				},
				{
					type: "text",
					text: " The natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Subject:",
				},
				{
					type: "text",
					text: " The identified or identifiable natural person to whom personal data relates.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Erasure:",
				},
				{
					type: "text",
					text: " The permanent deletion or irreversible anonymization of personal data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Recipient (GDPR Art 4(9)):",
				},
				{
					type: "text",
					text: " A natural or legal person, public authority, agency or another body, to which the personal data are disclosed, whether a third party or not.",
				},
			],
		},
		// 4. Grounds for Erasure (Art 17(1))
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "4. Grounds for Erasure" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The right to erasure applies in the following circumstances (Article 17(1)):",
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
									text: "a) The personal data are no longer necessary in relation to the purposes for which they were collected or otherwise processed.",
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
									text: "b) The data subject withdraws consent on which the processing is based according to point (a) of Article 6(1), or point (a) of Article 9(2), and where there is no other legal ground for the processing.",
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
									text: "c) The data subject objects to the processing pursuant to Article 21(1) (based on legitimate interests or public task) and there are no overriding legitimate grounds for the processing, or the data subject objects to the processing pursuant to Article 21(2) (direct marketing).",
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
									text: "d) The personal data have been unlawfully processed.",
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
									text: "e) The personal data have to be erased for compliance with a legal obligation in Union or Member State law to which the controller is subject.",
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
									text: "f) The personal data have been collected in relation to the offer of information society services referred to in Article 8(1) (consent of a child).",
								},
							],
						},
					],
				},
			],
		},
		// 5. Exceptions to Erasure (Art 17(3))
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "5. Exceptions to Erasure" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The right to erasure is not absolute. Erasure is not required to the extent that processing is necessary (Article 17(3)):",
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
									text: "a) For exercising the right of freedom of expression and information.",
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
									text: "b) For compliance with a legal obligation which requires processing by Union or Member State law to which the controller is subject or for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller.",
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
									text: "c) For reasons of public interest in the area of public health in accordance with points (h) and (i) of Article 9(2) as well as Article 9(3).",
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
									text: "d) For archiving purposes in the public interest, scientific or historical research purposes or statistical purposes in accordance with Article 89(1) in so far as the right referred to in paragraph 1 is likely to render impossible or seriously impair the achievement of the objectives of that processing.",
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
									text: "e) For the establishment, exercise or defence of legal claims.",
								},
							],
						},
					],
				},
			],
		},
		// 6. Procedure for Handling Erasure Requests
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "6. Procedure for Handling Erasure Requests",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.1. Receiving the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects can exercise their right to erasure by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The request should clearly identify the data subject. While not mandatory, requests may include the specific data to be erased and the grounds for erasure.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "All requests received must be logged promptly in the [Specify system, e.g., Data Subject Request Log].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.2. Verification of Identity" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures]. Only request minimum information needed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If unable to verify identity, inform the requester promptly.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "6.3. Assessing the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once identity is verified, the [Designated Role/Team, e.g., Privacy Team, DPO] will assess the request:",
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
									text: "Locate the personal data concerning the data subject across relevant systems.",
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
									text: "Determine if any of the grounds for erasure listed in Section 4 apply.",
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
									text: "Determine if any of the exceptions listed in Section 5 apply, which would justify retaining the data (or some of it).",
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
									text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)).",
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
			content: [{ type: "text", text: "6.4. Performing Erasure" }],
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
					text: " Erasure must be performed without undue delay, and at the latest within one month of receipt of the request (subject to identity verification).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Extension:",
				},
				{
					type: "text",
					text: " This period may be extended by two further months where necessary (complexity/number of requests). The data subject must be informed of the extension and reasons within one month.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Action:",
				},
				{
					type: "text",
					text: " If the request is valid and no exceptions apply, the [Responsible Team, e.g., IT Department, Engineering] will:",
				},
			],
		},
		{
			type: "orderedList",
			attrs: { tight: true, start: 1 },
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Securely delete the relevant personal data from all live systems.",
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
									text: "Ensure the data is put beyond use or scheduled for deletion from backup systems according to backup cycles and policies (data in backups does not need immediate deletion if technically infeasible, but must not be restored to live systems).",
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
									text: "Consider if anonymization is an appropriate alternative to deletion where applicable.",
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
					text: "6.5. Communication to Recipients (GDPR Art 19)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Where {{organization}} has made the personal data public, it must take reasonable steps, including technical measures, to inform controllers processing the data that the data subject has requested erasure of any links to, or copy or replication of, that personal data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must also communicate any erasure of personal data to each recipient to whom the data have been disclosed, unless this proves impossible or involves disproportionate effort.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} shall inform the data subject about those recipients if the data subject requests it.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [
				{ type: "text", text: "6.6. Informing the Data Subject" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once erasure is complete (or if the request is refused/partially fulfilled), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The communication should confirm that the data has been erased.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the request is refused (due to exceptions, unfounded/excessive nature, or inability to verify identity), the communication must explain the reasons and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4)).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the request is partially fulfilled (some data erased, some retained due to exceptions), clearly explain what has been erased and the justification for retaining the remaining data.",
				},
			],
		},
		// Roles and Responsibilities Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Roles and Responsibilities" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Data Subjects:",
				},
				{
					type: "text",
					text: " Responsible for submitting requests and cooperating with identity verification.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Customer Support / Designated Intake Channel]:",
				},
				{
					type: "text",
					text: " Responsible for receiving requests, initial logging, routing.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Privacy Team / DPO]:",
				},
				{
					type: "text",
					text: " Responsible for overseeing the process, assessing requests (grounds and exceptions), coordinating verification and erasure, managing communications.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[IT Department / Engineering Teams]:",
				},
				{
					type: "text",
					text: " Responsible for locating and technically performing the secure erasure from live and backup systems upon instruction.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "[Legal Counsel]:",
				},
				{
					type: "text",
					text: " Provide advice on complex requests, interpretation of exceptions, and legal risks.",
				},
			],
		},
		// Record Keeping Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "8. Record Keeping" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "A record of all erasure requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include details of the request, verification, assessment (grounds/exceptions), action taken (including date), communications with recipients, and communication with the data subject, including justifications for refusals or extensions.",
				},
			],
		},
		// Policy Review Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Policy Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary.",
				},
			],
		},
	],
} as const;
