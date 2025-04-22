import type { TemplatePolicy } from "../types";

export const rightToRectificationPolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "right_to_rectification",
		slug: "right-to-rectification-policy",
		name: "Right to Rectification Policy and Procedure",
		description:
			"Outlines the procedure for handling requests from data subjects to rectify inaccurate or incomplete personal data, in compliance with GDPR Article 16.",
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
					text: "Right to Rectification Policy and Procedure",
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
					text: "Under Article 16 of the General Data Protection Regulation (GDPR), data subjects have the right to obtain the rectification of inaccurate personal data concerning them from the controller without undue delay. They also have the right to have incomplete personal data completed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The purpose of this policy and procedure is to ensure that {{organization}} handles requests for rectification in a timely, compliant, and consistent manner, respecting the rights of data subjects.",
				},
			],
		},
		// Scope Section
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
		// Definitions Section
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
					text: "Rectification:",
				},
				{
					type: "text",
					text: " The correction of inaccurate personal data or the completion of incomplete personal data.",
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
		// Procedure Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{
					type: "text",
					text: "4. Procedure for Handling Rectification Requests",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.1. Receiving the Request" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Data subjects can exercise their right to rectification by submitting a request through [Specify channels, e.g., dedicated email address privacy@{{organization}}.com, customer portal, specific web form].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The request should clearly identify the data subject and specify the personal data considered inaccurate or incomplete, along with the proposed correction or completion.",
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
			content: [{ type: "text", text: "4.2. Verification of Identity" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must take reasonable steps to verify the identity of the individual making the request before processing it. The level of verification should be proportionate to the nature of the data.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Verification methods may include [Specify methods, e.g., asking for information previously provided, using secure account login procedures, requesting a form of ID if necessary and proportionate].",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If unable to verify identity, inform the requester promptly, explaining why and requesting additional information if possible.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "4.3. Assessing the Request" }],
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
									text: "Locate the personal data in question within {{organization}}'s systems.",
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
									text: "Evaluate whether the data is indeed inaccurate or incomplete for the purposes for which it is processed.",
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
									text: "Consider if the request is manifestly unfounded or excessive (GDPR Art 12(5)), particularly if repetitive. If so, {{organization}} may refuse to act or charge a reasonable fee.",
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
									text: "If the accuracy is contested and cannot be immediately verified, processing of the contested data may need to be restricted (GDPR Art 18) pending verification.",
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
			content: [{ type: "text", text: "4.4. Performing Rectification" }],
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
					text: " Rectification must be performed without undue delay, and at the latest within one month of receipt of the request.",
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
					text: " This period may be extended by two further months where necessary, taking into account the complexity and number of the requests. The data subject must be informed of any such extension within one month of receipt of the request, together with the reasons for the delay (GDPR Art 12(3)).",
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
					text: " If the request is deemed valid, the [Responsible Team, e.g., IT Department, Customer Support] will:",
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
									text: "Correct the inaccurate personal data in all relevant systems where it is stored.",
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
									text: "Complete incomplete personal data, potentially including by means of a supplementary statement provided by the data subject.",
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
					text: "4.5. Communication to Recipients (GDPR Art 19)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} must communicate any rectification of personal data to each recipient to whom the personal data have been disclosed, unless this proves impossible or involves disproportionate effort.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The [Designated Role/Team] will identify relevant recipients (e.g., third-party processors, integrated services) based on data processing records and notify them of the rectification.",
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
				{ type: "text", text: "4.6. Informing the Data Subject" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Once the rectification is complete (or if the request is refused), the [Designated Role/Team] must inform the data subject without undue delay, and at the latest within one month (or the extended period).",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The communication should confirm that the data has been rectified/completed.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If the request is refused (e.g., deemed manifestly unfounded/excessive, or accuracy cannot be disproven), the communication must explain the reasons for the refusal and inform the data subject of their right to lodge a complaint with a supervisory authority and to seek a judicial remedy (GDPR Art 12(4)).",
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
					text: "Data Subjects:",
				},
				{
					type: "text",
					text: " Responsible for providing accurate information when submitting a request and for cooperating with identity verification.",
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
					text: " Responsible for receiving requests, initial logging, and potentially initial identity verification.",
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
					text: " Responsible for overseeing the process, assessing requests, coordinating verification and rectification, managing communication with recipients and data subjects, and handling refusals.",
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
					text: " Responsible for locating and technically performing the rectification or completion of data in relevant systems upon instruction.",
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
					text: " Provide advice on complex requests, refusals, and legal interpretation.",
				},
			],
		},
		// Record Keeping Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "6. Record Keeping" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "A record of all rectification requests must be maintained in the [Specify system, e.g., Data Subject Request Log]. This log should include:",
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
									text: "Date request received.",
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
									text: "Data subject identification details (and verification method).",
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
									text: "Details of the inaccurate/incomplete data and the requested correction.",
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
									text: "Date(s) of actions taken (assessment, rectification, communication).",
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
									text: "Information provided to the data subject.",
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
									text: "Details of communications with recipients (if applicable).",
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
									text: "Justification if request was refused or deadline extended.",
								},
							],
						},
					],
				},
			],
		},
		// Policy Review Section
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "7. Policy Review" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "This policy and procedure will be reviewed at least annually by the [DPO/Compliance Lead] and updated as necessary to reflect changes in legal requirements, business operations, or best practices.",
				},
			],
		},
	],
} as const;
