import type { Policy } from "../types";

export const humanResourcesPolicy: Policy = {
	type: "doc",
	metadata: {
		id: "human_resources",
		slug: "human-resources-policy",
		name: "Human Resources Policy",
		description:
			"This policy outlines the principles and practices for recruitment, employee management, performance evaluations, and the enforcement of internal control responsibilities.",
		frequency: "yearly",
		department: "hr",
		usedBy: {
			soc2: ["CC1.3", "CC1.4"],
		},
	},
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Human Resources Policy" }],
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
							content: [{ type: "text", text: "Review Frequency" }],
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
							content: [{ type: "text", text: "{{organization}}" }],
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
							content: [{ type: "text", text: "HR Director" }],
						},
						{
							type: "tableCell",
							content: [{ type: "text", text: "Internal" }],
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
					text: "This policy governs all aspects of human resource management including recruitment, performance management, and employee accountability for internal control responsibilities.",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Policy" }],
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
									text: "Recruitment processes must include background checks and verification of qualifications for roles with access to sensitive information.",
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
									text: "Employees must complete training on internal controls and ethical behavior during onboarding and at regular intervals.",
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
									text: "Performance evaluations shall include assessments of adherence to internal control responsibilities.",
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
	],
};
