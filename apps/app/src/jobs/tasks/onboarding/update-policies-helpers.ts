import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import type { JSONContent } from '@tiptap/react';
import { logger } from '@trigger.dev/sdk/v3';
import { generateObject, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { generatePrompt } from '../../lib/prompts';

// Types
export type OrganizationData = {
  id: string;
  name: string | null;
  website: string | null;
};

export type PolicyData = {
  id: string;
  organizationId: string;
  content: JSONContent[] | null;
  name: string | null;
  description: string | null;
};

export type UpdatePolicyParams = {
  organizationId: string;
  policyId: string;
  contextHub: string;
};

export type PolicyUpdateResult = {
  policyId: string;
  contextHub: string;
  policy: PolicyData;
  updatedContent: {
    type: 'document';
    content: Record<string, unknown>[];
  };
};

/**
 * Fetches organization and policy data from database
 */
export async function fetchOrganizationAndPolicy(
  organizationId: string,
  policyId: string,
): Promise<{ organization: OrganizationData; policy: PolicyData }> {
  const [organization, policy] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, website: true },
    }),
    db.policy.findUnique({
      where: { id: policyId, organizationId },
      select: {
        id: true,
        organizationId: true,
        content: true,
        name: true,
        description: true,
      },
    }),
  ]);

  if (!organization) {
    throw new Error(`Organization not found for ${organizationId}`);
  }

  if (!policy) {
    throw new Error(`Policy not found for ${policyId}`);
  }

  return { organization, policy };
}

/**
 * Generates the prompt for policy content generation
 */
export async function generatePolicyPrompt(
  policy: PolicyData,
  contextHub: string,
  organization: OrganizationData,
): Promise<string> {
  return await generatePrompt({
    existingPolicyContent: policy.content,
    contextHub,
    policy,
    companyName: organization.name ?? 'Company',
    companyWebsite: organization.website ?? 'https://company.com',
  });
}

/**
 * Generates policy content using AI with TipTap JSON schema
 */
export async function generatePolicyContent(prompt: string): Promise<{
  type: 'document';
  content: Record<string, unknown>[];
}> {
  try {
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
        content: z.array(z.record(z.unknown())),
      }),
    });

    return object;
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
}

/**
 * Updates policy content in the database
 */
export async function updatePolicyInDatabase(
  policyId: string,
  content: Record<string, unknown>[],
): Promise<void> {
  try {
    await db.policy.update({
      where: { id: policyId },
      data: { content: content as JSONContent[] },
    });
  } catch (dbError) {
    logger.error(`Failed to update policy in database: ${dbError}`);
    throw dbError;
  }
}

/**
 * Complete policy update workflow
 */
export async function processPolicyUpdate(params: UpdatePolicyParams): Promise<PolicyUpdateResult> {
  const { organizationId, policyId, contextHub } = params;

  // Fetch organization and policy data
  const { organization, policy } = await fetchOrganizationAndPolicy(organizationId, policyId);

  // Generate prompt for AI
  const prompt = await generatePolicyPrompt(policy, contextHub, organization);

  // Generate new policy content
  const updatedContent = await generatePolicyContent(prompt);

  // Update policy in database
  await updatePolicyInDatabase(policyId, updatedContent.content);

  return {
    policyId,
    contextHub,
    policy,
    updatedContent,
  };
}
