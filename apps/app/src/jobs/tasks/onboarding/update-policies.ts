import { openai } from "@ai-sdk/openai";
import { db } from "@comp/db";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { JSONContent } from "novel";
import { z } from "zod";
import { generatePrompt } from "../../lib/prompts";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const updatePolicies = schemaTask({
  id: "update-policies",
  schema: z.object({
    organizationId: z.string(),
    policyId: z.string(),
    contextHub: z.string(),
  }),
  run: async ({ organizationId, policyId, contextHub }) => {
    try {
      const organization = await db.organization.findUnique({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        logger.error(`Organization not found for ${organizationId}`);
        return;
      }

      const policy = await db.policy.findUnique({
        where: {
          id: policyId,
          organizationId,
        },
      });

      if (!policy) {
        logger.error(`Policy not found for ${policyId}`);
        return;
      }

      const prompt = await generatePrompt({
        existingPolicyContent: policy?.content,
        contextHub,
        policy,
        companyName: organization?.name ?? "Company",
        companyWebsite: organization?.website ?? "https://company.com",
      });

      try {
        const { text } = await generateText({
          model: openai("o4-mini"),
          system:
            "You are an expert at writing security policies in TipTap JSON.",
          prompt: `Update the following policy to be strictly aligned with SOC 2 standards and controls. Only include JSON content as your output.

					${prompt.replace(/\\n/g, "\n")}`,
        });

        if (!text) {
          logger.error(`Failed generating policy for ${policyId}`);
          return;
        }

        const { object } = await generateObject({
          model: openai("gpt-4.1-mini"),
          mode: "json",
          system:
            "You are an expert at writing security policies in TipTap JSON.",
          prompt: `Convert the following text into TipTap JSON. Do not include any other text in your output: ${JSON.stringify(text)}`,
          schema: z.object({
            json: z.array(z.any()),
          }),
        });

        try {
          await db.policy.update({
            where: {
              id: policyId,
            },
            data: {
              content: object.json as JSONContent[],
            },
          });

          return {
            policyId,
            contextHub,
            policy,
            updatedContent: text,
          };
        } catch (dbError) {
          logger.error(`Failed to update policy in database: ${dbError}`);
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
