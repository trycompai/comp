import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { generatePrompt } from '../../lib/prompts';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

export const updatePolicies = schemaTask({
  id: 'update-policies',
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
        companyName: organization?.name ?? 'Company',
        companyWebsite: organization?.website ?? 'https://company.com',
      });

      try {
        // Generate TipTap JSON directly in one step to avoid malformed JSON issues
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          mode: 'json',
          system: `You are an expert at writing security policies. Generate content directly as TipTap JSON format.

TipTap JSON structure:
- Root: {"type": "document", "content": [array of nodes]}
- Paragraphs: {"type": "paragraph", "content": [text nodes]}
- Headings: {"type": "heading", "attrs": {"level": 1-6}, "content": [text nodes]}
- Lists: {"type": "orderedList"/"bulletList", "content": [listItem nodes]}
- List items: {"type": "listItem", "content": [paragraph nodes]}
- Text: {"type": "text", "text": "content", "marks": [formatting]}
- Bold: {"type": "bold"} in marks array
- Italic: {"type": "italic"} in marks array

IMPORTANT: Follow ALL formatting instructions in the prompt, implementing them as proper TipTap JSON structures.`,
          prompt: `Generate a SOC 2 compliant security policy as a complete TipTap JSON document.

INSTRUCTIONS TO IMPLEMENT IN TIPTAP JSON:
${prompt.replace(/\\n/g, '\n')}

Return the complete TipTap document following ALL the above requirements using proper TipTap JSON structure.`,
          schema: z.object({
            type: z.literal('document'),
            content: z.array(z.record(z.string(), z.unknown())),
          }),
        });

        try {
          await db.policy.update({
            where: {
              id: policyId,
            },
            data: {
              content: object.content as JSONContent[],
            },
          });

          return {
            policyId,
            contextHub,
            policy,
            updatedContent: object,
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
      logger.error(`Unexpected error in updatePolicies: ${error}`);
      throw error;
    }
  },
});
