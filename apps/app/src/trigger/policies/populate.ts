import { companyDetailslatestVersionSchema } from "@/app/[locale]/(app)/(dashboard)/[orgId]/implementation/lib/models/CompanyDetails";
import { openai } from "@ai-sdk/openai";
import { db } from "@comp/db";
import { Prisma } from "@comp/db/types";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { generateObject, NoObjectGeneratedError } from "ai";
import { JSONContent } from "novel";
import { z } from "zod";
import { generatePrompt } from "./prompts";

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not set");
}

export const populatePolicyWithAI = schemaTask({
	id: "populate-policy-with-ai",
	schema: z.object({
		organizationId: z.string(),
		policyId: z.string(),
		companyDetails: companyDetailslatestVersionSchema,
		risks: z.any(),
	}),
	maxDuration: 1000 * 60 * 10,
	run: async ({ organizationId, policyId, risks, companyDetails }) => {
		try {
			logger.info(
				`Running populate policies with company details for ${organizationId}`,
			);

			const policy = await db.policy.findUnique({
				where: {
					id: policyId,
				},
			});

			if (!policy) {
				logger.error(`Policy not found for ${policyId}`);
				return;
			}

			try {
				// Create a policy document with the exact structure expected by Novel/TipTap
				const { object } = await generateObject({
					model: openai("gpt-4.5-preview"),
					schemaName: "A policy document",
					schemaDescription:
						"A policy document formatted for the library novel",
					mode: "json",
					// This is the exact schema structure expected by Novel/TipTap

					schema: z.object({
						content: z.array(
							z.object({
								type: z.string(),
								attrs: z.record(z.any()).optional(),
								content: z.array(z.any()).optional(),
								text: z.string().optional(),
								marks: z
									.array(
										z.object({
											type: z.string(),
											attrs: z.record(z.any()).optional(),
										}),
									)
									.optional(),
							}),
						),
					}),
					prompt: generatePrompt({
						existingPolicyContent: policy?.content as
							| JSONContent
							| JSONContent[],
						companyDetails,
						risks,
						policy,
					}),
				});

				logger.info(
					`Generated object for ${policyId}, ${JSON.stringify(object, null, 2)}`,
				);

				if (!object) {
					logger.error(`Failed generating policy for ${policyId}`);
					return;
				}

				try {
					await db.policy.update({
						where: {
							id: policyId,
						},
						data: {
							content: object.content,
						},
					});

					logger.info(
						`Populated policies with company details for ${organizationId}`,
					);

					return {
						policyId,
						companyDetails,
						risks,
						policy,
						updatedContent: object.content,
					};
				} catch (dbError) {
					logger.error(
						`Failed to update policy in database: ${dbError}`,
					);
					throw dbError;
				}
			} catch (aiError) {
				logger.error(`Error generating AI content: ${aiError}`);

				if (NoObjectGeneratedError.isInstance(aiError)) {
					logger.error(
						`NoObjectGeneratedError: ${JSON.stringify({
							cause: aiError.cause,
							text: aiError.text,
							response: aiError.response,
							usage: aiError.usage,
						})}`,
					);
				}
				throw aiError;
			}
		} catch (error) {
			logger.error(`Unexpected error in populatePolicyWithAI: ${error}`);
			throw error;
		}
	},
});
