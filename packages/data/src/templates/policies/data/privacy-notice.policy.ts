import type { TemplatePolicy } from "../types";

export const privacyNoticePolicy: TemplatePolicy = {
	type: "doc",
	metadata: {
		id: "privacy_notice",
		slug: "privacy-notice",
		name: "Privacy Notice",
		description:
			"This document explains how we collect, use, and protect your personal data in compliance with GDPR Articles 12, 13, and 14.",
		frequency: "yearly", // Or as needed based on changes
		department: "admin",
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Privacy Notice" }],
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
							content: [{ type: "text", text: "Effective Date" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Last Updated" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Contact" }],
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
							content: [{ type: "text", text: "{{date}}" }], // Effective Date
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "{{date}}" }], // Last Updated Date
						},
						{
							type: "tableCell",
							content: [
								{
									type: "text",
									text: "Data Protection Officer / Legal Department", // Or specific contact email
								},
							],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Public" }], // Usually public
						},
					],
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "1. Introduction" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "{{organization}} ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Notice explains how we collect, use, disclose, and safeguard your personal data when you use our services ('Services'). It also describes your rights regarding your personal data and how you can exercise them.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We process personal data in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws. This notice addresses the requirements of GDPR Articles 12, 13, and 14.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "2. Data Controller Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "The data controller responsible for your personal data is {{organization}}, located at [Your Company Address]. You can contact our Data Protection Officer (DPO) or the relevant department for privacy matters at [Your Privacy Contact Email/Address].",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "3. Information We Collect" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We collect personal data through various means, including:",
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
									text: "Data You Provide Directly (Art. 13):",
								},
								{
									type: "text",
									text: " This includes information you provide when you register for an account, use our Services, subscribe to newsletters, fill out forms, contact support, or communicate with us. Examples include:",
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
															text: "Contact Information: Name, email address, phone number, company name, job title.",
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
															text: "Account Information: Username, password, profile information.",
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
															text: "Payment Information: Billing details, credit card information (processed securely by third-party payment processors).",
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
															text: "Communications: Records of your correspondence with us.",
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
															text: "User Content: Data you upload or submit while using the Services.",
														},
													],
												},
											],
										},
									],
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
									text: "Data Collected Automatically:",
								},
								{
									type: "text",
									text: " When you use our Services, we may automatically collect certain information about your device and usage. Examples include:",
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
															text: "Log Data: IP address, browser type, operating system, access times, pages viewed, referring URLs.",
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
															text: "Usage Data: Features used, actions taken within the application, performance metrics.",
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
															text: "Cookies and Similar Technologies: We use cookies to enhance user experience, analyze usage, and for authentication. [Link to Cookie Policy, if separate]",
														},
													],
												},
											],
										},
									],
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
									text: "Data Obtained from Third Parties (Art. 14):",
								},
								{
									type: "text",
									text: " We may occasionally receive information about you from third-party sources, such as:",
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
															text: "Integration Partners: If you integrate third-party services with our platform.",
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
															text: "Publicly Available Sources: Data from public databases or websites (e.g., company information).",
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
															text: "Marketing Partners: Data from partners assisting with marketing efforts (where legally permitted).",
														},
													],
												},
											],
										},
									],
								},
								{
									type: "text",
									text: " When we obtain data from third parties, we will inform you about the source and categories of data collected, unless providing such information proves impossible or would involve a disproportionate effort, or where obtaining or disclosure is expressly laid down by law, or where the personal data must remain confidential subject to an obligation of professional secrecy.",
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
			content: [
				{
					type: "text",
					text: "4. How We Use Your Information (Purposes of Processing)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We use the collected personal data for the following purposes:",
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
									text: "To Provide and Manage Services: Operate, maintain, and improve our Services, authenticate users, process transactions.",
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
									text: "To Communicate With You: Respond to inquiries, send service-related announcements, provide customer support, send marketing communications (with consent where required).",
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
									text: "For Personalization: Customize your experience and content.",
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
									text: "For Security and Compliance: Protect against fraud and abuse, enforce our terms, comply with legal obligations, respond to legal requests.",
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
									text: "For Analytics and Improvement: Understand how users interact with our Services to improve them.",
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
			content: [{ type: "text", text: "5. Legal Basis for Processing" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We process your personal data based on the following legal grounds under GDPR:",
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
									marks: [{ type: "bold" }],
									text: "Consent (Art. 6(1)(a)):",
								},
								{
									type: "text",
									text: " Where you have given explicit consent for specific purposes (e.g., marketing emails). You can withdraw consent at any time.",
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
									text: "Contractual Necessity (Art. 6(1)(b)):",
								},
								{
									type: "text",
									text: " Processing necessary to perform a contract with you (e.g., providing the Services you signed up for) or to take steps at your request before entering into a contract.",
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
									text: "Legal Obligation (Art. 6(1)(c)):",
								},
								{
									type: "text",
									text: " Processing necessary to comply with a legal obligation (e.g., tax laws, responding to lawful requests).",
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
									text: "Legitimate Interests (Art. 6(1)(f)):",
								},
								{
									type: "text",
									text: " Processing necessary for our legitimate interests (e.g., improving services, security, preventing fraud), provided these interests are not overridden by your fundamental rights and freedoms.",
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
			content: [{ type: "text", text: "6. Data Sharing and Disclosure" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We do not sell your personal data. We may share your information with the following categories of recipients:",
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
									marks: [{ type: "bold" }],
									text: "Service Providers (Processors):",
								},
								{
									type: "text",
									text: " Third-party vendors who perform services on our behalf, such as cloud hosting, payment processing, analytics, customer support, and marketing assistance. These processors are bound by contractual obligations to protect your data and use it only for the purposes we specify.",
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
									text: "Legal Requirements:",
								},
								{
									type: "text",
									text: " If required by law, regulation, legal process, or governmental request.",
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
									text: "Business Transfers:",
								},
								{
									type: "text",
									text: " In connection with a merger, acquisition, sale of assets, or other business transition, your data may be transferred as part of the transaction.",
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
									text: "Protection of Rights:",
								},
								{
									type: "text",
									text: " To protect the rights, property, or safety of {{organization}}, our users, or others.",
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
									text: "With Your Consent:",
								},
								{
									type: "text",
									text: " We may share your data with third parties when we have your explicit consent to do so.",
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
			content: [
				{ type: "text", text: "7. International Data Transfers" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Your personal data may be transferred to, stored, and processed in countries other than your own, including countries outside the European Economic Area (EEA) where data protection laws may differ. We ensure that such transfers comply with GDPR by implementing appropriate safeguards, such as:",
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
									text: "Transfers to countries deemed adequate by the European Commission.",
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
									text: "Use of Standard Contractual Clauses (SCCs) approved by the European Commission.",
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
									text: "Other valid transfer mechanisms permitted under GDPR.",
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
					text: "You can request more information about the safeguards we use for international transfers.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "8. Data Retention" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements. The criteria used to determine retention periods include:",
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
									text: "The duration of your relationship with us and the provision of Services.",
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
									text: "Legal obligations to retain data for certain periods.",
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
									text: "The potential risk of harm from unauthorized use or disclosure.",
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
									text: "Whether we can achieve the purposes through other means.",
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
					text: "Once retention periods expire, we will securely delete or anonymize your personal data.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "9. Your Data Protection Rights" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Under GDPR, you have the following rights regarding your personal data:",
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
									marks: [{ type: "bold" }],
									text: "Right of Access:",
								},
								{
									type: "text",
									text: " Request access to the personal data we hold about you.",
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
									text: "Right to Rectification:",
								},
								{
									type: "text",
									text: " Request correction of inaccurate or incomplete data.",
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
									text: "Right to Erasure ('Right to be Forgotten'):",
								},
								{
									type: "text",
									text: " Request deletion of your personal data under certain conditions.",
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
									text: "Right to Restriction of Processing:",
								},
								{
									type: "text",
									text: " Request restriction of processing under certain conditions.",
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
									text: "Right to Data Portability:",
								},
								{
									type: "text",
									text: " Request transfer of your data to another organization or directly to you, where technically feasible.",
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
									text: "Right to Object:",
								},
								{
									type: "text",
									text: " Object to processing based on legitimate interests or for direct marketing.",
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
									text: "Right to Withdraw Consent:",
								},
								{
									type: "text",
									text: " Withdraw consent at any time where processing is based on consent.",
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
									text: "Right to Lodge a Complaint:",
								},
								{
									type: "text",
									text: " Lodge a complaint with a supervisory authority (data protection authority) in your country of residence.",
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
					text: "To exercise these rights, please contact us using the details provided in Section 2. We will respond to your request in accordance with applicable data protection laws, usually within one month.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "10. Data Security" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We implement appropriate technical and organizational measures to protect your personal data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. These measures include [mention general measures like encryption, access controls, regular security assessments - reference relevant security policies if applicable]. However, no method of transmission over the Internet or electronic storage is 100% secure.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "11. Children's Privacy" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Our Services are not intended for individuals under the age of [Specify age, e.g., 16 or 13 depending on jurisdiction and service]. We do not knowingly collect personal data from children. If we become aware that we have collected personal data from a child without parental consent, we will take steps to delete that information.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [
				{ type: "text", text: "12. Changes to this Privacy Notice" },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "We may update this Privacy Notice from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated notice on our website or through other communication channels. We encourage you to review this notice periodically.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "13. Contact Information" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "If you have any questions, concerns, or requests regarding this Privacy Notice or our data protection practices, please contact us at:",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "{{organization}}" },
				{ type: "hardBreak" },
				{ type: "text", text: "[Your Company Address]" },
				{ type: "hardBreak" },
				{ type: "text", text: "[Your Privacy Contact Email/Address]" },
				{ type: "hardBreak" },
				{ type: "text", text: "[Link to DPO contact if applicable]" },
			],
		},
	],
} as const;
